import "server-only";

import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";

import { computeOwnership, type Ownership, type OwnershipInput } from "./ownership";
import { CHART_DAYS, computeProgress, type Progress, type ProgressInput } from "./progress";

/**
 * The learner's progress from their visible cards, reviews, answers of the last CHART_DAYS days and ready sessions.
 * Learner reads through RLS, columns by name (never model_answer); the user_id filters decide ownership in code too.
 * Each list is read with `fetchAll`, so a learner with more than 1000 answers isn't silently cut short.
 *
 * @param userId - The signed-in learner.
 * @param now - The current time, from the page.
 * @returns The computed progress (see `computeProgress`).
 */
export async function getProgress(userId: string, now: Date): Promise<Progress> {
  const supabase = await createClient();
  // One extra day so the oldest chart day is whole in any time zone.
  const since = new Date(now.getTime() - (CHART_DAYS + 1) * 24 * 60 * 60 * 1000).toISOString();

  const [profile, cards, reviews, answers, sessions] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
    fetchAll<ProgressInput["cards"][number]>((from, to) =>
      supabase
        .from("decision_cards")
        .select("id, session_id")
        .eq("user_id", userId)
        .order("id")
        .range(from, to),
    ),
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
    fetchAll<ProgressInput["sessions"][number]>((from, to) =>
      supabase
        .from("sessions")
        .select("id, title, repo, branch")
        .eq("user_id", userId)
        .eq("status", "ready")
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
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
 * The dashboard's ownership meter from the learner's visible cards, their sessions' repos, reviews and answers scored 2.
 * Same reads as `getProgress`: RLS client, columns by name, `user_id` filters, every list through `fetchAll`.
 *
 * @param userId - The signed-in learner.
 * @returns See `computeOwnership`.
 */
export async function getOwnership(userId: string): Promise<Ownership> {
  const supabase = await createClient();
  const [cards, sessions, reviews, explained] = await Promise.all([
    fetchAll<OwnershipInput["cards"][number]>((from, to) =>
      supabase
        .from("decision_cards")
        .select("id, session_id")
        .eq("user_id", userId)
        .order("id")
        .range(from, to),
    ),
    fetchAll<OwnershipInput["sessions"][number]>((from, to) =>
      supabase
        .from("sessions")
        .select("id, repo")
        .eq("user_id", userId)
        .order("id")
        .range(from, to),
    ),
    fetchAll<OwnershipInput["reviews"][number]>((from, to) =>
      supabase
        .from("reviews")
        .select("card_id, step, mastered")
        .eq("user_id", userId)
        .order("card_id")
        .range(from, to)
        // step has a check constraint (0 to 3) that the generated types read as number.
        .overrideTypes<OwnershipInput["reviews"], { merge: false }>(),
    ),
    fetchAll<{ card_id: string }>((from, to) =>
      supabase
        .from("answers")
        .select("card_id")
        .eq("user_id", userId)
        .eq("score", 2)
        .order("id")
        .range(from, to),
    ),
  ]);
  return computeOwnership({
    cards,
    sessions,
    reviews,
    explainedIds: explained.map(({ card_id }) => card_id),
  });
}
