import "server-only";

import { createClient } from "@/lib/supabase/server";

import {
  localDate,
  PAGE_SIZE,
  SESSION_COLUMNS,
  type SessionListItem,
  type SessionSummary,
} from "./rows";

// Learner reads through the RLS client. The caller passes the signed-in learner's id (from getCurrentUser), so access
// is decided before the query; the user_id filter also uses the (user_id, created_at) index.

/**
 * One page of the learner's sessions, newest first, with the visible card count of each ready session.
 *
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

/** The learner's latest sessions for the sidebar, newest first, with card counts. */
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

/** Visible cards per ready session. RLS hides `hidden` cards; only session_id is selected, never model_answer. */
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
 * Cards due today: `reviews.due_on <= today` in the learner's `profiles.timezone`, not mastered.
 *
 * @returns The count, 0 until reviews exist.
 */
export async function dueTodayCount(userId: string, now: Date): Promise<number> {
  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle<{ timezone: string }>();
  if (profileError) throw new Error(`dueTodayCount: ${profileError.message}`);
  const { count, error } = await supabase
    .from("reviews")
    .select("card_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("mastered", false)
    .lte("due_on", localDate(profile?.timezone ?? "UTC", now));
  if (error) throw new Error(`dueTodayCount: ${error.message}`);
  return count ?? 0;
}
