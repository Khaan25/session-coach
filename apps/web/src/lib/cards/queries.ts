import "server-only";

import { z } from "zod";

import { SESSION_COLUMNS, type SessionSummary } from "@/lib/sessions/rows";
import { createClient } from "@/lib/supabase/server";

import { CARD_COLUMNS, type CardView } from "./columns";

/**
 * One of the learner's sessions and, once it is ready, its visible cards in order. Learner reads through RLS: hidden
 * cards and other learners' rows never come back, and the user_id filter decides ownership in code too.
 *
 * @returns null when the id isn't a uuid or isn't one of the learner's sessions.
 */
export async function getSessionWithCards(
  userId: string,
  sessionId: string,
): Promise<{ session: SessionSummary; cards: CardView[] } | null> {
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

  const { data: cards, error: cardsError } = await supabase
    .from("decision_cards")
    .select(CARD_COLUMNS)
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("position")
    .overrideTypes<CardView[], { merge: false }>();
  if (cardsError) throw new Error(`getSessionWithCards: ${cardsError.message}`);
  return { session, cards };
}
