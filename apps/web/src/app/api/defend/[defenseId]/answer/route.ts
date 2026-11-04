/**
 * POST /api/defend/[defenseId]/answer { answer }: stores the learner's first answer and returns one AI follow-up
 * question with a fresh 120 s clock. No grade yet. Returns { followUpQuestion, followUpStartedAt, followUpDueAt,
 * followUpSeconds, serverNow }.
 */
import { NextResponse } from "next/server";

import { requireUser, serverError } from "@/lib/api/http";
import {
  defendAnswerSchema,
  deadlineOf,
  FOLLOW_UP_INSTRUCTIONS,
  FOLLOW_UP_SECONDS,
  followUpData,
  ANSWER_SECONDS,
  parseFollowUp,
} from "@/lib/defend/defend";
import {
  invalidDefenseId,
  limitedModelCall,
  loadDefense,
  modelErrorResponse,
  parseDefenseId,
  refuseIfLate,
} from "@/lib/defend/guards";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Takes the first answer. Learners can't write `defenses` (RLS); this route writes with the service role after checking
 * the defense is theirs.
 *
 * - Auth first, then the path id and body, so a stranger learns nothing about the shape.
 * - The defense must be the caller's (404 otherwise, decided in code) and still `answering` (409 otherwise).
 * - Late means after the 180 s deadline plus 5 s, by the server clock: the defense is marked `expired` and the answer
 *   refused with 409, before any model call.
 * - Spends one of the learner's 60 model calls an hour, then asks the grade task for the follow-up, retrying once on
 *   invalid output. Nothing is stored until the question exists, so a model failure leaves the defense `answering`.
 * - Stores the answer and question with a compare-and-set on `status`: a second submit racing this one gets 409. The
 *   follow-up's 120 s clock starts when the question is stored. No answer key is ever returned.
 *
 * @param request - JSON body `{ answer }`.
 * @returns 200 `{ followUpQuestion, followUpStartedAt, followUpDueAt, followUpSeconds, serverNow }`; 400 bad id or
 *   body; 401 signed out; 404 not the learner's defense; 409 not answering, late, or answered twice at once; 429 over
 *   60 an hour (`Retry-After`); 502 the model failed; 503 not configured; 500 else.
 */
export async function POST(request: Request, context: { params: Promise<{ defenseId: string }> }) {
  const signedIn = await requireUser();
  if (signedIn instanceof NextResponse) return signedIn;
  const { user } = signedIn;

  const defenseId = parseDefenseId((await context.params).defenseId);
  if (!defenseId) return invalidDefenseId();
  const body: unknown = await request.json().catch(() => null);
  const parsed = defendAnswerSchema.safeParse(body);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join(".") || "body";
    return NextResponse.json({ error: `Invalid ${field}`, field }, { status: 400 });
  }
  const { answer } = parsed.data;

  try {
    const admin = createAdminClient();
    const now = new Date();
    const loaded = await loadDefense(admin, defenseId, user.id);
    if (!loaded) return NextResponse.json({ error: "Defense not found" }, { status: 404 });
    const { defense, card } = loaded;
    if (defense.status !== "answering") {
      return NextResponse.json(
        { error: "This defense isn't waiting for a first answer." },
        { status: 409 },
      );
    }
    const late = await refuseIfLate(
      admin,
      defense,
      { startedAt: defense.started_at, seconds: ANSWER_SECONDS },
      now,
    );
    if (late) return late;

    const question = await limitedModelCall(
      user.id,
      { instructions: FOLLOW_UP_INSTRUCTIONS, data: followUpData(card, answer) },
      parseFollowUp,
    );
    if (question instanceof Response) return question;
    if (!question) {
      console.error("[api/defend/answer] follow-up output invalid twice", { defenseId });
      return NextResponse.json(
        { error: "Your answer couldn't be processed. Try again." },
        { status: 502 },
      );
    }

    // A fresh time: the model call took a while, and the follow-up clock starts when the question is stored.
    const followUpStartedAt = new Date();
    const stored = await admin
      .from("defenses")
      .update({
        status: "follow_up",
        answer,
        answered_at: now.toISOString(),
        follow_up_question: question,
        follow_up_started_at: followUpStartedAt.toISOString(),
      })
      .eq("id", defenseId)
      .eq("status", "answering")
      .select("id");
    if (stored.error) throw stored.error;
    if (stored.data.length === 0) {
      return NextResponse.json(
        { error: "This defense was just answered. Reload to continue." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      followUpQuestion: question,
      followUpStartedAt: followUpStartedAt.toISOString(),
      followUpDueAt: deadlineOf(followUpStartedAt, FOLLOW_UP_SECONDS).toISOString(),
      followUpSeconds: FOLLOW_UP_SECONDS,
      serverNow: followUpStartedAt.toISOString(),
    });
  } catch (error) {
    return (
      modelErrorResponse("[api/defend/answer]", error) ??
      serverError("[api/defend/answer]", error, "Something went wrong. Try again.")
    );
  }
}
