/**
 * POST /api/defend/[defenseId]/follow-up { answer }: takes the answer to the follow-up question, grades the whole
 * defense 0, 1 or 2, and finishes it. Returns { score, missing, label }: the label is "defended (timed, follow-up)",
 * never "verified".
 */
import { NextResponse } from "next/server";

import { requireUser, serverError } from "@/lib/api/http";
import {
  DEFEND_GRADE_INSTRUCTIONS,
  DEFENDED_LABEL,
  defendAnswerSchema,
  defendGradeData,
  FOLLOW_UP_SECONDS,
} from "@/lib/defend/defend";
import {
  invalidDefenseId,
  limitedModelCall,
  loadDefense,
  modelErrorResponse,
  parseDefenseId,
  refuseIfLate,
} from "@/lib/defend/guards";
import { parseGrade } from "@/lib/review/grade";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Grades a defense. Learners can't write `defenses` (RLS); this route writes with the service role after checking the
 * defense is theirs.
 *
 * - Auth first, then the path id and body.
 * - The defense must be the caller's (404, decided in code) and in `follow_up` (409 otherwise).
 * - Late means after the 120 s deadline plus 5 s from when the question was stored, by the server clock: the defense is
 *   marked `expired` and the answer refused with 409, before any model call.
 * - Spends one of the learner's 60 model calls an hour, then grades with `callModel("grade")`, retrying once on invalid
 *   output.
 * - Finishes with a compare-and-set on `status`, so a second submit gets 409. A defense doesn't touch `answers` or
 *   `reviews`: it never moves the review schedule. No answer key is ever returned.
 *
 * @param request - JSON body `{ answer }`.
 * @returns 200 `{ score, missing, label }`; 400 bad id or body; 401 signed out; 404 not the learner's defense; 409 not
 *   waiting for a follow-up answer, late, or answered twice at once; 429 over 60 an hour (`Retry-After`); 502 the
 *   model failed; 503 not configured; 500 else.
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
  const followUpAnswer = parsed.data.answer;

  try {
    const admin = createAdminClient();
    const now = new Date();
    const loaded = await loadDefense(admin, defenseId, user.id);
    if (!loaded) return NextResponse.json({ error: "Defense not found" }, { status: 404 });
    const { defense, card } = loaded;
    if (
      defense.status !== "follow_up" ||
      !defense.follow_up_started_at ||
      !defense.answer ||
      !defense.follow_up_question
    ) {
      return NextResponse.json(
        { error: "This defense isn't waiting for a follow-up answer." },
        { status: 409 },
      );
    }
    const late = await refuseIfLate(
      admin,
      defense,
      { startedAt: defense.follow_up_started_at, seconds: FOLLOW_UP_SECONDS },
      now,
    );
    if (late) return late;

    const grade = await limitedModelCall(
      user.id,
      {
        instructions: DEFEND_GRADE_INSTRUCTIONS,
        data: defendGradeData(card, {
          answer: defense.answer,
          followUpQuestion: defense.follow_up_question,
          followUpAnswer,
        }),
      },
      parseGrade,
    );
    if (grade instanceof Response) return grade;
    if (!grade) {
      console.error("[api/defend/follow-up] grading output invalid twice", { defenseId });
      return NextResponse.json(
        { error: "Your answer couldn't be scored. Try again." },
        { status: 502 },
      );
    }

    const finished = await admin
      .from("defenses")
      .update({
        status: "finished",
        follow_up_answer: followUpAnswer,
        score: grade.score,
        finished_at: new Date().toISOString(),
      })
      .eq("id", defenseId)
      .eq("status", "follow_up")
      .select("id");
    if (finished.error) throw finished.error;
    if (finished.data.length === 0) {
      return NextResponse.json(
        { error: "This defense was just finished. Reload to see its grade." },
        { status: 409 },
      );
    }

    return NextResponse.json({ score: grade.score, missing: grade.missing, label: DEFENDED_LABEL });
  } catch (error) {
    return (
      modelErrorResponse("[api/defend/follow-up]", error) ??
      serverError("[api/defend/follow-up]", error, "Something went wrong. Try again.")
    );
  }
}
