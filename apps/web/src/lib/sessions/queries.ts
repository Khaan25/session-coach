import "server-only";

import { createClient } from "@/lib/supabase/server";

import { PAGE_SIZE, SESSION_COLUMNS, type SessionListItem, type SessionSummary } from "./rows";

// Learner reads through the RLS client. The caller passes the signed-in learner's id (from getCurrentUser), so access
// is decided before the query; the user_id filter also uses the (user_id, created_at) index.

/**
 * One page of the learner's sessions, newest first, with the visible card count of each ready session.
 *
 * @param options.userId - The signed-in learner.
 * @param options.page - The 1-based page from `?page=` (see `parsePage`).
 * @returns The page's rows and whether an older page exists.
 */
export async function listSessions({
  userId,
  page,
}: {
  userId: string;
  page: number;
}): Promise<{ sessions: SessionListItem[]; hasMore: boolean }> {
  const supabase = await createClient();
  const from = (page - 1) * PAGE_SIZE;
  // One extra row tells whether a next page exists without a count query.
  const { data, error } = await supabase
    .from("sessions")
    .select(SESSION_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + PAGE_SIZE)
    .overrideTypes<SessionSummary[], { merge: false }>();
  if (error) throw new Error(`listSessions: ${error.message}`);
  const sessions = data.slice(0, PAGE_SIZE);
  return { sessions: await withCardCounts(sessions), hasMore: data.length > PAGE_SIZE };
}

/**
 * The learner's latest sessions for the sidebar, newest first, with card counts.
 *
 * @param userId - The signed-in learner.
 * @param limit - How many to show.
 */
export async function recentSessions(userId: string, limit = 5): Promise<SessionListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select(SESSION_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit)
    .overrideTypes<SessionSummary[], { merge: false }>();
  if (error) throw new Error(`recentSessions: ${error.message}`);
  return withCardCounts(data);
}

/**
 * Visible cards per ready session. RLS hides `hidden` cards; only session_id is selected, never model_answer.
 *
 * @param sessions - The rows to annotate; only ready ones get a `cardCount`.
 */
async function withCardCounts(sessions: SessionSummary[]): Promise<SessionListItem[]> {
  const ready = sessions.filter(({ status }) => status === "ready").map(({ id }) => id);
  if (ready.length === 0) return sessions;
  const supabase = await createClient();
  // shortcut: counts in JS over at most 20 sessions x ~5 cards; switch to an RPC if sessions grow past ~100 cards.
  const { data, error } = await supabase
    .from("decision_cards")
    .select("session_id")
    .in("session_id", ready)
    .overrideTypes<{ session_id: string }[], { merge: false }>();
  if (error) throw new Error(`withCardCounts: ${error.message}`);
  const counts = new Map<string, number>();
  for (const { session_id } of data) counts.set(session_id, (counts.get(session_id) ?? 0) + 1);
  return sessions.map((s) =>
    s.status === "ready" ? { ...s, cardCount: counts.get(s.id) ?? 0 } : s,
  );
}

/**
 * Why a learner has no visible cards, from their latest session: none sent yet, the latest still being read, the latest
 * failed (`sessionId` links to its error), or sessions that gave none.
 */
export type Cardless =
  | { reason: "no-sessions" | "processing" | "no-cards" }
  | { reason: "failed"; sessionId: string };

/**
 * Read only for a learner with no visible card, so a card screen doesn't tell someone whose session is processing to
 * set up the CLI again. Only the latest session counts: an older row left pending says nothing about now.
 *
 * @param userId - The signed-in learner.
 */
export async function cardlessReason(userId: string): Promise<Cardless> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`cardlessReason: ${error.message}`);
  if (!data) return { reason: "no-sessions" };
  if (data.status === "pending" || data.status === "processing") return { reason: "processing" };
  if (data.status === "failed") return { reason: "failed", sessionId: data.id };
  return { reason: "no-cards" };
}
