/**
 * POST /api/review/answer { cardId, answer }: grades the learner's explanation of one card and moves it along the
 * day 1/3/7 schedule (plan, Phase 6 step 2). Returns { score, missing, modelAnswer, evidence, nextDue }: the answer key
 * reaches the browser only here, after the answer is in.
 */
import { NextResponse } from "next/server";

import { callModel, ModelCallError, ModelConfigError } from "@/lib/model/call-model";
import { answerRequestSchema, GRADE_INSTRUCTIONS, gradeData, parseGrade } from "@/lib/review/grade";
import { nextReview, type Step } from "@/lib/review/schedule";
import { localDate } from "@/lib/sessions/rows";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type GradedCard = {
  user_id: string;
  hidden: boolean;
  question: string;
  why: string;
  evidence: unknown;
  model_answer: string;
};

/**
 * Grades one answer. Learners can't write `answers` or `reviews` (RLS), so a learner can't fake progress; this route
 * writes both with the service role after checking the card is theirs.
 *
 * - Validates the body before any query or model call, so bad input costs nothing.
 * - `getUser()` checks the session with the auth server, since grading writes data.
 * - Reads the card (with its answer key), its review row and the learner's time zone in parallel.
 * - Grades with `callModel("grade")`, retrying once when the output doesn't fit `{ score, missing }`.
 * - Moves `reviews` with a compare-and-set on `updated_at`, then inserts the `answers` row.
 *
 * @param request - JSON body `{ cardId, answer }`.
 * @returns 200 `{ score, missing, modelAnswer, evidence, nextDue }`; 400 bad body; 401 signed out; 404 not the
 *   learner's card or hidden; 409 answered twice at once; 502 the model failed; 503 grading not configured; 500 else.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = answerRequestSchema.safeParse(body);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join(".") || "body";
    return NextResponse.json({ error: `Invalid ${field}`, field }, { status: 400 });
  }
  const { cardId, answer } = parsed.data;

  const supabase = await createClient();
  // getUser(), not getClaims(): asks the auth server, so a deleted or banned user's live JWT is refused.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const admin = createAdminClient();
    const [cardResult, reviewResult, profileResult] = await Promise.all([
      admin
        .from("decision_cards")
        .select("user_id, hidden, question, why, evidence, model_answer")
        .eq("id", cardId)
        .maybeSingle<GradedCard>(),
      admin
        .from("reviews")
        .select("step, updated_at")
        .eq("card_id", cardId)
        .maybeSingle<{ step: Step; updated_at: string }>(),
      admin
        .from("profiles")
        .select("timezone")
        .eq("id", user.id)
        .maybeSingle<{ timezone: string }>(),
    ]);
    if (cardResult.error) throw cardResult.error;
    if (reviewResult.error) throw reviewResult.error;
    if (profileResult.error) throw profileResult.error;
    const card = cardResult.data;
    // Decided here, not by the query: the service role sees every learner's cards.
    if (!card || card.user_id !== user.id || card.hidden)
      return NextResponse.json({ error: "Card not found" }, { status: 404 });

    const input = { instructions: GRADE_INSTRUCTIONS, data: gradeData(card, answer) };
    const grade =
      parseGrade(await callModel("grade", input)) ?? parseGrade(await callModel("grade", input));
    if (!grade) {
      console.error("[api/review/answer] grading output invalid twice", { cardId });
      return NextResponse.json(
        { error: "Your answer couldn't be scored. Try again." },
        { status: 502 },
      );
    }

    const step = reviewResult.data?.step ?? 0;
    const next = nextReview(
      step,
      grade.score,
      localDate(profileResult.data?.timezone ?? "UTC", new Date()),
    );
    // Move the schedule first, and only from the state this request read: a second submit racing this one finds the
    // row changed (or already inserted) and gets 409, so one answer can't advance a card twice.
    const schedule = {
      card_id: cardId,
      user_id: user.id,
      step: next.step,
      due_on: next.due_on,
      mastered: next.mastered,
      last_score: grade.score,
      updated_at: new Date().toISOString(),
    };
    const previous = reviewResult.data;
    const moved = previous
      ? await admin
          .from("reviews")
          .update(schedule)
          .eq("card_id", cardId)
          .eq("updated_at", previous.updated_at)
          .select("card_id")
      : await admin.from("reviews").insert(schedule).select("card_id");
    if (moved.error?.code === "23505" || (!moved.error && moved.data.length === 0)) {
      return NextResponse.json(
        { error: "This card was just answered. Reload to see its next review." },
        { status: 409 },
      );
    }
    if (moved.error) throw moved.error;

    // shortcut: two writes, not one transaction; if this insert fails the schedule has moved without its answer row.
    // Move both into one RPC if the progress numbers ever need to be exact.
    const { error: answerError } = await admin.from("answers").insert({
      card_id: cardId,
      user_id: user.id,
      review_step: step,
      answer,
      score: grade.score,
      missing: grade.missing || null,
    });
    if (answerError) throw answerError;

    return NextResponse.json({
      score: grade.score,
      missing: grade.missing,
      modelAnswer: card.model_answer,
      evidence: card.evidence,
      nextDue: next.due_on,
    });
  } catch (error) {
    if (error instanceof ModelConfigError) {
      console.error("[api/review/answer] grading not configured:", error.message);
      return NextResponse.json(
        { error: "Grading isn't set up yet. Your answer wasn't saved; try again later." },
        { status: 503 },
      );
    }
    if (error instanceof ModelCallError) {
      console.error("[api/review/answer] model call failed", error.cause);
      return NextResponse.json(
        { error: "Your answer couldn't be scored. Try again." },
        { status: 502 },
      );
    }
    console.error("[api/review/answer] failed", error);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
