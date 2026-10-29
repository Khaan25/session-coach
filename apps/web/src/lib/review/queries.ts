import "server-only";

import type { Session } from "@session-coach/shared/session";

import { localDate } from "@/lib/sessions/rows";
import { createClient } from "@/lib/supabase/server";

import type { Step } from "./schedule";

// Learner reads through the RLS client: hidden cards and model_answer never come back. The caller passes the signed-in
// learner's id, so access is decided before the query. The daily email cron, the dashboard banner and the queue share
// this "due today" rule (plan, maintenance notes).

type Supabase = Awaited<ReturnType<typeof createClient>>;
type SessionName = Pick<Session, "title" | "repo" | "branch">;

/**
 * The learner's today (YYYY-MM-DD) in their `profiles.timezone`, so a card due "tomorrow" turns up at their midnight,
 * not the server's.
 *
 * @param supabase - The learner's RLS client.
 * @param userId - The signed-in learner.
 * @param now - The current time.
 */
async function learnerToday(supabase: Supabase, userId: string, now: Date) {
  const { data, error } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle<{ timezone: string }>();
  if (error) throw new Error(`learnerToday: ${error.message}`);
  return localDate(data?.timezone ?? "UTC", now);
}

/**
 * A session's name as the app shows it: title, else repo on branch.
 *
 * @param session - The embedded session, or null when the embed came back empty.
 */
export function sessionName(session: SessionName | null) {
  return (
    session?.title ||
    [session?.repo, session?.branch].filter(Boolean).join(" on ") ||
    "Untitled session"
  );
}

/**
 * Cards due today: `reviews.due_on <= today` in the learner's `profiles.timezone`, not mastered.
 *
 * @param userId - The signed-in learner.
 * @param now - The current time; defaults to now.
 * @returns The count, 0 until reviews exist.
 */
export async function dueTodayCount(userId: string, now = new Date()): Promise<number> {
  const supabase = await createClient();
  const today = await learnerToday(supabase, userId, now);
  const { count, error } = await supabase
    .from("reviews")
    .select("card_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("mastered", false)
    .lte("due_on", today);
  if (error) throw new Error(`dueTodayCount: ${error.message}`);
  return count ?? 0;
}

/** One row of the review queue. `step` 0 is a card never answered. */
export type QueueCard = {
  id: string;
  decision: string;
  sessionId: string;
  sessionName: string;
  step: Step;
  dueOn: string | null;
};

type CardRow = { id: string; decision: string; session_id: string; session: SessionName | null };
const CARD_COLUMNS = "id, decision, session_id, session:sessions(title, repo, branch)";

/**
 * The review queue (plan, Phase 6 step 4): cards due today, oldest due first, then cards from the last 7 days that
 * were never answered, oldest first.
 *
 * - Two queries in parallel: due `reviews` with their card embedded, and recent `decision_cards` with their review.
 * - A card has no `reviews` row until its first answer, so new cards come from the second query, not the first.
 * - New cards older than 7 days are left out, so a learner back from a break isn't handed the whole backlog.
 *
 * @param userId - The signed-in learner.
 * @param now - The current time, from the page.
 * @returns Due cards first, then new ones.
 */
export async function reviewQueue(userId: string, now: Date): Promise<QueueCard[]> {
  const supabase = await createClient();
  const today = await learnerToday(supabase, userId, now);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [due, recent] = await Promise.all([
    supabase
      .from("reviews")
      .select(`step, due_on, card:decision_cards(${CARD_COLUMNS})`)
      .eq("user_id", userId)
      .eq("mastered", false)
      .lte("due_on", today)
      .order("due_on")
      .order("card_id")
      .overrideTypes<{ step: Step; due_on: string; card: CardRow | null }[], { merge: false }>(),
    supabase
      .from("decision_cards")
      .select(`${CARD_COLUMNS}, reviews(card_id)`)
      .eq("user_id", userId)
      .gte("created_at", weekAgo)
      .order("created_at")
      .order("position")
      .overrideTypes<(CardRow & { reviews: unknown })[], { merge: false }>(),
  ]);
  if (due.error) throw new Error(`reviewQueue: ${due.error.message}`);
  if (recent.error) throw new Error(`reviewQueue: ${recent.error.message}`);

  const toQueue = (card: CardRow, step: Step, dueOn: string | null): QueueCard => ({
    id: card.id,
    decision: card.decision,
    sessionId: card.session_id,
    sessionName: sessionName(card.session),
    step,
    dueOn,
  });
  // RLS drops a hidden card from the embed, leaving card null.
  const dueCards = due.data.flatMap(({ step, due_on, card }) =>
    card ? [toQueue(card, step, due_on)] : [],
  );
  // reviews(card_id) is one-to-one (card_id is its primary key): null or [] means never answered.
  const fresh = recent.data
    .filter(({ reviews }) => reviews === null || (Array.isArray(reviews) && reviews.length === 0))
    .map((card) => toQueue(card, 0, null));
  return [...dueCards, ...fresh];
}

/** What the quiz shows before an answer: the decision and the question, never the why or the answer key. */
export type QuizCard = {
  id: string;
  decision: string;
  question: string;
  sessionId: string;
  sessionName: string;
};

/**
 * One visible card of the learner's, or null (another learner's, hidden, or missing). `cardId` must be a UUID.
 * Selects the question but not the why: showing the reason before the learner explains it would give the answer away.
 *
 * @param userId - The signed-in learner.
 * @param cardId - The `[cardId]` route segment.
 */
export async function getQuizCard(userId: string, cardId: string): Promise<QuizCard | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("decision_cards")
    .select("id, decision, question, session_id, session:sessions(title, repo, branch)")
    .eq("id", cardId)
    .eq("user_id", userId)
    .maybeSingle()
    .overrideTypes<CardRow & { question: string }, { merge: false }>();
  if (error) throw new Error(`getQuizCard: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    decision: data.decision,
    question: data.question,
    sessionId: data.session_id,
    sessionName: sessionName(data.session),
  };
}
