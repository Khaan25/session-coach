/**
 * POST /api/review/answer { cardId, answer } or { cardId, dontKnow: true }: grades the learner's explanation of one
 * card, or records an honest skip, and moves it along the review schedule (day 1, 4, 11) (plan, Phase 6 step 2). Returns
 * { score, missing, why, modelAnswer, evidence, nextDue, step, level, dropped }: the why and the answer key reach the
 * browser only here, after the learner has tried.
 */
import { NextResponse } from "next/server";

import { requireUser, serverError, UNIQUE_VIOLATION } from "@/lib/api/http";
import { tooManyRequests, userRateLimit } from "@/lib/auth/rate-limit";
import { callModel, ModelCallError, ModelConfigError } from "@/lib/model/call-model";
import {
  answerRequestSchema,
  DONT_KNOW_ANSWER,
  GRADE_INSTRUCTIONS,
  gradeData,
  parseGrade,
  skipGrade,
} from "@/lib/review/grade";
import { levelOf } from "@/lib/review/level";
import { isDue, nextReview, type Step } from "@/lib/review/schedule";
import {
  answeredSince,
  countAnsweredToday,
  DAILY_CAP,
  DAILY_CAP_MESSAGE,
} from "@/lib/review/today";
import { localDate } from "@/lib/sessions/rows";
import { createAdminClient } from "@/lib/supabase/admin";

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
 * - Refuses a card that has a review row but isn't due in the learner's today (mastered, or answered for this step
 *   already), before the model call, so answering early can't move or un-master it.
 * - Refuses any card once the learner has given `DAILY_CAP` answers (skips included) in their today, the same cap
 *   as the queue (`lib/review/today.ts`), so a new card opened from /s/[id] can't go past it. Nothing is written.
 * - An honest skip (`dontKnow`) is scored 0 with no model call and no rate limit, stored with `answers.skipped`, and
 *   keeps the card's step: it comes back tomorrow, no level lost. It still passes the due check, so it can't be used
 *   to peek at a card twice a day.
 * - Otherwise spends one of the learner's 60 grades an hour (`userRateLimit`), since each costs a model call.
 * - Grades with `callModel("grade")`, retrying once when the output doesn't fit `{ score, missing }`.
 * - Moves `reviews` with a compare-and-set on `updated_at`, then inserts the `answers` row. If that insert fails, the
 *   schedule is put back, so the learner can answer again.
 *
 * @param request - JSON body `{ cardId, answer }` or `{ cardId, dontKnow: true }`.
 * @returns 200 `{ score, missing, why, modelAnswer, evidence, nextDue, step, level, dropped }` (`step` and `level`
 *   after this answer, `dropped` when a miss moved it down a step); 400 bad body; 401 signed out; 404 not the
 *   learner's card or hidden; 409 answered twice at once, not due today, or the day's cap reached; 429 over 60 an hour
 *   (`Retry-After`); 502 the model failed; 503 grading not configured; 500 else.
 */
export async function POST(request: Request) {
  const signedIn = await requireUser();
  if (signedIn instanceof NextResponse) return signedIn;
  const { user } = signedIn;

  const body: unknown = await request.json().catch(() => null);
  const parsed = answerRequestSchema.safeParse(body);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join(".") || "body";
    return NextResponse.json({ error: `Invalid ${field}`, field }, { status: 400 });
  }
  const { cardId } = parsed.data;
  const dontKnow = parsed.data.dontKnow === true;
  const answer = parsed.data.answer ?? DONT_KNOW_ANSWER;

  try {
    const admin = createAdminClient();
    const now = new Date();
    const [cardResult, reviewResult, profileResult, answersResult] = await Promise.all([
      admin
        .from("decision_cards")
        .select("user_id, hidden, question, why, evidence, model_answer")
        .eq("id", cardId)
        .maybeSingle<GradedCard>(),
      admin
        .from("reviews")
        // last_score is unread here but kept: this row is the rollback payload if the answer insert fails.
        .select("step, updated_at, due_on, mastered, last_score")
        .eq("card_id", cardId)
        .maybeSingle<{
          step: Step;
          updated_at: string;
          due_on: string | null;
          mastered: boolean;
          last_score: number | null;
        }>(),
      admin.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
      admin
        .from("answers")
        .select("created_at")
        .eq("user_id", user.id)
        .gte("created_at", answeredSince(now))
        .overrideTypes<{ created_at: string }[], { merge: false }>(),
    ]);
    if (cardResult.error) throw cardResult.error;
    if (reviewResult.error) throw reviewResult.error;
    if (profileResult.error) throw profileResult.error;
    if (answersResult.error) throw answersResult.error;
    const card = cardResult.data;
    // Decided here, not by the query: the service role sees every learner's cards.
    if (!card || card.user_id !== user.id || card.hidden)
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    const timeZone = profileResult.data?.timezone ?? "UTC";
    const today = localDate(timeZone, now);
    if (reviewResult.data && !isDue(reviewResult.data, today)) {
      return NextResponse.json(
        {
          error: reviewResult.data.mastered
            ? "You've mastered this card, so it has no more reviews."
            : `This card isn't due until ${reviewResult.data.due_on}. Come back then.`,
        },
        { status: 409 },
      );
    }

    // shortcut: two answers racing past the 4th can both land, so the day can end at 6; move the count into the
    // write (an RPC) if that matters.
    const answeredToday = countAnsweredToday(
      answersResult.data.map(({ created_at }) => created_at),
      timeZone,
      today,
    );
    if (answeredToday >= DAILY_CAP)
      return NextResponse.json({ error: DAILY_CAP_MESSAGE }, { status: 409 });

    const grade = dontKnow ? skipGrade() : await gradeAnswer(user.id, card, answer);
    if (grade instanceof Response) return grade;
    if (!grade) {
      console.error("[api/review/answer] grading output invalid twice", { cardId });
      return NextResponse.json(
        { error: "Your answer couldn't be scored. Try again." },
        { status: 502 },
      );
    }

    const step = reviewResult.data?.step ?? 0;
    // A fresh date: grading can cross the learner's midnight, and the schedule counts from the day it was answered.
    const next = nextReview(step, grade.score, localDate(timeZone, new Date()), dontKnow);
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
    if (moved.error?.code === UNIQUE_VIOLATION || (!moved.error && moved.data.length === 0)) {
      return NextResponse.json(
        { error: "This card was just answered. Reload to see its next review." },
        { status: 409 },
      );
    }
    if (moved.error) throw moved.error;

    const { error: answerError } = await admin.from("answers").insert({
      card_id: cardId,
      user_id: user.id,
      review_step: step,
      answer,
      score: grade.score,
      missing: grade.missing || null,
      skipped: dontKnow,
    });
    if (answerError) {
      // shortcut: two writes, not one transaction, so a failed answer row undoes the schedule move by hand; only from the
      // state this request wrote. Move both into one RPC if this ever fails in practice.
      const undo = previous
        ? admin
            .from("reviews")
            .update(previous)
            .eq("card_id", cardId)
            .eq("updated_at", schedule.updated_at)
        : admin
            .from("reviews")
            .delete()
            .eq("card_id", cardId)
            .eq("updated_at", schedule.updated_at);
      const { error: undoError } = await undo;
      if (undoError)
        console.error("[api/review/answer] schedule not put back", { cardId }, undoError);
      throw answerError;
    }

    return NextResponse.json({
      score: grade.score,
      missing: grade.missing,
      why: card.why,
      modelAnswer: card.model_answer,
      evidence: card.evidence,
      nextDue: next.due_on,
      step: next.step,
      level: levelOf(next),
      dropped: next.step < step,
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
    return serverError("[api/review/answer]", error, "Something went wrong. Try again.");
  }
}

/**
 * One model grade of a real answer: spends one of the learner's grades for the hour, then calls the grader, retrying
 * once on invalid output. Here, not before the 404 and 409 checks: those cost no model call.
 *
 * @returns the grade, null when the output was invalid twice, or the 429 response when over the limit.
 */
async function gradeAnswer(userId: string, card: GradedCard, answer: string) {
  const limited = await userRateLimit("grade", userId);
  if (limited) return tooManyRequests(limited);
  const input = { instructions: GRADE_INSTRUCTIONS, data: gradeData(card, answer) };
  return parseGrade(await callModel("grade", input)) ?? parseGrade(await callModel("grade", input));
}
