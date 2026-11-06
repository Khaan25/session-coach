import "server-only";

import { z } from "zod";

import { SESSION_COLUMNS, type SessionSummary } from "@/lib/sessions/rows";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import {
  CARD_COLUMNS,
  CARD_HEAD_COLUMNS,
  type CardHead,
  type CardView,
  lockUnanswered,
  type SessionCard,
} from "./columns";

/** The summary plus when its current run started, so the page can tell a stuck run (`isStuck`) from a live one. */
export type SessionWithRun = SessionSummary & { processing_started_at: string | null };

/**
 * One of the learner's sessions and, once it is ready, its visible cards in order. Learner reads through RLS: hidden
 * cards and other learners' rows never come back, and the user_id filter decides ownership in code too.
 *
 * @param userId - The signed-in learner, from `getCurrentUser()`.
 * @param sessionId - The `[id]` route segment, unchecked.
 * @returns null when the id isn't a uuid or isn't one of the learner's sessions; otherwise
 *   - `session`: the summary columns, whatever its status;
 *   - `cards`: its visible cards by `position`, empty until the session is ready. A card the learner hasn't answered
 *     carries only its decision and question: its why and evidence are read only once a reviews row exists, so the
 *     answer isn't in the page before the learner tries (retrieval before reveal). Learners can't read those two
 *     columns at all (migration 20261104000000), so `revealAnswered` reads them with the service role.
 */
export async function getSessionWithCards(
  userId: string,
  sessionId: string,
): Promise<{ session: SessionWithRun; cards: SessionCard[] } | null> {
  // A malformed id would be a Postgres cast error; it is simply not found.
  if (!z.uuid().safeParse(sessionId).success) return null;
  const supabase = await createClient();
  const { data: session, error } = await supabase
    .from("sessions")
    .select(`${SESSION_COLUMNS}, processing_started_at`)
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle<SessionWithRun>();
  if (error) throw new Error(`getSessionWithCards: ${error.message}`);
  if (!session) return null;
  if (session.status !== "ready") return { session, cards: [] };

  // reviews(card_id) is one-to-one (card_id is its primary key): a row exists once the card is answered or skipped.
  const { data: rows, error: headsError } = await supabase
    .from("decision_cards")
    .select(`${CARD_HEAD_COLUMNS}, reviews(card_id)`)
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("position")
    .overrideTypes<(CardHead & { reviews: unknown })[], { merge: false }>();
  if (headsError) throw new Error(`getSessionWithCards: ${headsError.message}`);
  const answered = rows
    .filter(({ reviews }) => reviews !== null && !(Array.isArray(reviews) && reviews.length === 0))
    .map(({ id }) => id);
  if (answered.length === 0) return { session, cards: lockUnanswered(rows, []) };

  return { session, cards: lockUnanswered(rows, await revealAnswered(userId, answered)) };
}

/**
 * The full columns of the learner's answered cards, read with the service role because learners can't read `why` or
 * `evidence`. The service role skips RLS, so the owner, visibility and answer checks are made here: in the query (an
 * inner embed of `reviews`, so a card with no answer never comes back) and again on each row before it is returned.
 *
 * @param userId - The signed-in learner, from `getCurrentUser()`.
 * @param cardIds - Cards the learner's own RLS read saw with a `reviews` row.
 */
async function revealAnswered(userId: string, cardIds: string[]): Promise<CardView[]> {
  const { data, error } = await createAdminClient()
    .from("decision_cards")
    .select(`${CARD_COLUMNS}, user_id, hidden, reviews!inner(user_id)`)
    .eq("user_id", userId)
    .eq("hidden", false)
    .in("id", cardIds)
    .overrideTypes<
      (CardView & { user_id: string; hidden: boolean; reviews: unknown })[],
      { merge: false }
    >();
  if (error) throw new Error(`revealAnswered: ${error.message}`);
  return data
    .filter((row) => row.user_id === userId && !row.hidden && answeredBy(row.reviews, userId))
    .map(({ id, position, decision, why, source, evidence, files, question, flagged }) => ({
      id,
      position,
      decision,
      why,
      source,
      evidence,
      files,
      question,
      flagged,
    }));
}

/** Whether an embedded `reviews` (one-to-one, so an object, or an array from some clients) is the learner's own. */
function answeredBy(reviews: unknown, userId: string): boolean {
  const row = Array.isArray(reviews) ? reviews[0] : reviews;
  return (row as { user_id?: string } | null)?.user_id === userId;
}
