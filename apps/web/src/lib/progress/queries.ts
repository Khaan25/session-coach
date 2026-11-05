import "server-only";

import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";

import { sessionName } from "@/lib/sessions/name";

import { cardPath, type CardPath, type CardPathInput } from "./card-path";
import { computeOwnership, type Ownership } from "./ownership";
import { CHART_DAYS, computeProgress, type Progress, type ProgressInput } from "./progress";

/**
 * The learner's progress from their visible cards, reviews, answers of the last CHART_DAYS days and ready sessions.
 * Learner reads through RLS, columns by name (never model_answer); the user_id filters decide ownership in code too.
 * Each list is read with `fetchAll`, so a learner with more than 1000 answers isn't silently cut short.
 * With `repo`, only that project's cards and sessions are read; `computeProgress` then drops the other cards' reviews
 * and answers, so every number narrows to the project.
 *
 * @param userId - The signed-in learner.
 * @param now - The current time, from the page.
 * @param repo - One project (`?repo=`, see `parseRepo`); null for every project.
 * @returns The computed progress (see `computeProgress`).
 */
export async function getProgress(
  userId: string,
  now: Date,
  repo: string | null = null,
): Promise<Progress> {
  const supabase = await createClient();
  // One extra day so the oldest chart day is whole in any time zone.
  const since = new Date(now.getTime() - (CHART_DAYS + 1) * 24 * 60 * 60 * 1000).toISOString();

  const [profile, cards, reviews, answers, sessions] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
    fetchAll<ProgressInput["cards"][number]>((from, to) => {
      // The inner embed lets the repo filter reach the card's session; every card has one, so it drops nothing else.
      let query = supabase
        .from("decision_cards")
        .select("id, session_id, session:sessions!inner(repo)")
        .eq("user_id", userId);
      if (repo) query = query.eq("session.repo", repo);
      return query.order("id").range(from, to);
    }),
    fetchAll<ProgressInput["reviews"][number]>((from, to) =>
      supabase
        .from("reviews")
        .select("card_id, step, mastered")
        .eq("user_id", userId)
        .order("card_id")
        .range(from, to),
    ),
    fetchAll<ProgressInput["answers"][number]>((from, to) =>
      supabase
        .from("answers")
        .select("card_id, score, created_at")
        .eq("user_id", userId)
        .gte("created_at", since)
        .order("id")
        .range(from, to)
        // score has a check constraint (0, 1 or 2) that the generated types read as number.
        .overrideTypes<ProgressInput["answers"], { merge: false }>(),
    ),
    fetchAll<ProgressInput["sessions"][number]>((from, to) => {
      let query = supabase
        .from("sessions")
        .select("id, title, repo, branch")
        .eq("user_id", userId)
        .eq("status", "ready");
      if (repo) query = query.eq("repo", repo);
      return query.order("created_at", { ascending: false }).order("id").range(from, to);
    }),
  ]);
  if (profile.error) throw new Error(`getProgress: ${profile.error.message}`);

  return computeProgress({
    cards,
    reviews,
    answers,
    sessions,
    timeZone: profile.data?.timezone ?? "UTC",
    now,
  });
}

/**
 * The dashboard's ownership meter: `learner_ownership()` counts explained, owned and visible cards per repo in Postgres
 * (one row per repo, RLS applies since it runs as the learner), then `computeOwnership` adds the overall line.
 *
 * @returns See `computeOwnership`.
 */
export async function getOwnership(): Promise<Ownership> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("learner_ownership");
  if (error) throw error;
  return computeOwnership(data);
}

/**
 * One of the learner's own cards to teach the schedule with: the furthest along (owned first, then the highest step),
 * with all its answers. Learner reads through RLS; the inner embed drops a hidden card. Only the decision's title is
 * read, never its why, evidence or answer key.
 *
 * @param userId - The signed-in learner.
 * @param now - The current time, from the page.
 * @param repo - Pick the card from this project only (`?repo=`); null for every project.
 * @returns The card's path (see `cardPath`), or null when no card has been answered.
 */
export async function getCardPath(
  userId: string,
  now: Date,
  repo: string | null = null,
): Promise<CardPath | null> {
  const supabase = await createClient();
  // Both embeds are inner so the repo filter drops the review row, not just its session; every card has a session.
  let reviewQuery = supabase
    .from("reviews")
    .select(
      "card_id, step, due_on, mastered, card:decision_cards!inner(decision, created_at, session:sessions!inner(title, repo, branch))",
    )
    .eq("user_id", userId);
  if (repo) reviewQuery = reviewQuery.eq("card.session.repo", repo);
  const [profile, review] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
    reviewQuery
      .order("mastered", { ascending: false })
      .order("step", { ascending: false })
      .order("due_on")
      .limit(1)
      .maybeSingle(),
  ]);
  if (profile.error) throw new Error(`getCardPath: ${profile.error.message}`);
  if (review.error) throw new Error(`getCardPath: ${review.error.message}`);
  if (!review.data) return null;

  const answers = await supabase
    .from("answers")
    .select("score, review_step, skipped, created_at")
    .eq("user_id", userId)
    .eq("card_id", review.data.card_id)
    .order("created_at")
    .overrideTypes<CardPathInput["answers"], { merge: false }>();
  if (answers.error) throw new Error(`getCardPath: ${answers.error.message}`);

  const { card, step, due_on, mastered } = review.data;
  return cardPath({
    decision: card.decision,
    session: card.session ? sessionName(card.session) : "your session",
    createdAt: card.created_at,
    answers: answers.data,
    review: { step, due_on, mastered },
    timeZone: profile.data?.timezone ?? "UTC",
    now,
  });
}
