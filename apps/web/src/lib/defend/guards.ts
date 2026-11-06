import "server-only";

import { NextResponse } from "next/server";

import { tooManyRequests, userRateLimit } from "@/lib/auth/rate-limit";
import { callModel, ModelCallError, ModelConfigError } from "@/lib/model/call-model";
import { createAdminClient } from "@/lib/supabase/admin";
import { defenseIdSchema, isLate, type DefendCard } from "@/lib/defend/defend";

// What the two defend answer routes share: the model-error answers, the ownership and deadline checks, and the
// rate-limited model call. The routes keep their own bodies and docs.

type Admin = ReturnType<typeof createAdminClient>;

/** The 400 for a `[defenseId]` that isn't a uuid. */
export function invalidDefenseId() {
  return NextResponse.json({ error: "Invalid defenseId", field: "defenseId" }, { status: 400 });
}

/** Parses the `[defenseId]` path segment; null when it isn't a uuid. */
export function parseDefenseId(raw: string) {
  const parsed = defenseIdSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * The response for a failed model call, or null when the error is something else (for the route's 500). Same answers as
 * the review answer route: 503 when grading isn't configured, 502 when the provider failed.
 *
 * @param route - The log prefix, like `[api/defend/answer]`.
 */
export function modelErrorResponse(route: string, error: unknown) {
  if (error instanceof ModelConfigError) {
    console.error(`${route} grading not configured:`, error.message);
    return NextResponse.json(
      { error: "Defend isn't set up yet. Your answer wasn't saved; try again later." },
      { status: 503 },
    );
  }
  if (error instanceof ModelCallError) {
    console.error(`${route} model call failed`, error.cause);
    return NextResponse.json(
      { error: "Your answer couldn't be processed. Try again." },
      { status: 502 },
    );
  }
  return null;
}

/**
 * Spends one of the learner's model calls for the hour, then calls the grade task, retrying once when `parse` rejects
 * the output. The spend is checked here, after the 404 and 409 checks: those cost no model call.
 *
 * @returns the parsed output, null when it was invalid twice, or the 429 response when over the limit.
 */
export async function limitedModelCall<T>(
  userId: string,
  input: { instructions: string; data: Record<string, unknown> },
  parse: (output: unknown) => T | null,
) {
  const limited = await userRateLimit("grade", userId);
  if (limited) return tooManyRequests(limited);
  return parse(await callModel("grade", input)) ?? parse(await callModel("grade", input));
}

/** What a defense row and its card give the answer routes. `model_answer` is the answer key: server only. */
export type LoadedDefense = {
  defense: {
    id: string;
    user_id: string;
    card_id: string;
    status: string;
    started_at: string;
    answer: string | null;
    follow_up_question: string | null;
    follow_up_started_at: string | null;
  };
  card: DefendCard;
};

/**
 * Reads a defense and its card with the service role, and decides in code that the defense is the signed-in learner's.
 *
 * @returns The defense and card, or null when there is no such defense or it belongs to someone else: the route
 *   answers 404 either way.
 * @throws On a database error, which is a 500, never a 404.
 */
export async function loadDefense(
  admin: Admin,
  defenseId: string,
  userId: string,
): Promise<LoadedDefense | null> {
  const { data: defense, error } = await admin
    .from("defenses")
    .select(
      "id, user_id, card_id, status, started_at, answer, follow_up_question, follow_up_started_at",
    )
    .eq("id", defenseId)
    .maybeSingle();
  if (error) throw error;
  // Decided here, not by the query: the service role sees every learner's defenses.
  if (!defense || defense.user_id !== userId) return null;
  const { data: card, error: cardError } = await admin
    .from("decision_cards")
    .select("question, why, evidence, model_answer")
    .eq("id", defense.card_id)
    .maybeSingle();
  if (cardError) throw cardError;
  if (!card) return null;
  return { defense, card };
}

/**
 * Whether an answer arriving at `now` missed its window. A late one also moves the defense to `expired`, so the
 * learner can start another; the update only applies to a defense still in `status`.
 */
export async function refuseIfLate(
  admin: Admin,
  defense: { id: string; status: string },
  window: { startedAt: string; seconds: number },
  now: Date,
) {
  if (!isLate(window.startedAt, window.seconds, now)) return null;
  const { error } = await admin
    .from("defenses")
    .update({ status: "expired" })
    .eq("id", defense.id)
    .eq("status", defense.status);
  if (error) throw error;
  return NextResponse.json(
    { error: "Time's up, so this defense wasn't saved. Start another one." },
    { status: 409 },
  );
}
