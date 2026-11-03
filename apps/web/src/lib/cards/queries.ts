import "server-only";

import { z } from "zod";

import { SESSION_COLUMNS, type SessionSummary } from "@/lib/sessions/rows";
import { createClient } from "@/lib/supabase/server";

import {
  CARD_COLUMNS,
  CARD_HEAD_COLUMNS,
  type CardHead,
  type CardView,
  lockUnanswered,
  type SessionCard,
} from "./columns";

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
 *     answer isn't in the page before the learner tries (retrieval before reveal).
 */
export async function getSessionWithCards(
  userId: string,
  sessionId: string,
): Promise<{ session: SessionSummary; cards: SessionCard[] } | null> {
  // A malformed id would be a Postgres cast error; it is simply not found.
  if (!z.uuid().safeParse(sessionId).success) return null;
  const supabase = await createClient();
  const { data: session, error } = await supabase
    .from("sessions")
    .select(SESSION_COLUMNS)
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle<SessionSummary>();
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
  const heads = rows.map(({ reviews: _, ...head }) => head);
  const answered = rows
    .filter(({ reviews }) => reviews !== null && !(Array.isArray(reviews) && reviews.length === 0))
    .map(({ id }) => id);
  if (answered.length === 0) return { session, cards: lockUnanswered(heads, []) };

  const { data: revealed, error: revealError } = await supabase
    .from("decision_cards")
    .select(CARD_COLUMNS)
    .eq("user_id", userId)
    .in("id", answered)
    .overrideTypes<CardView[], { merge: false }>();
  if (revealError) throw new Error(`getSessionWithCards: ${revealError.message}`);
  return { session, cards: lockUnanswered(heads, revealed) };
}
