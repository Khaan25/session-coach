import "server-only";

import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";

import { CHART_DAYS, computeProgress, type Progress, type ProgressInput } from "./progress";

/**
 * The learner's progress from their visible cards, reviews, answers of the last CHART_DAYS days and ready sessions.
 * Learner reads through RLS, columns by name (never model_answer); the user_id filters decide ownership in code too.
 */
export async function getProgress(userId: string, now: Date): Promise<Progress> {
  const supabase = await createClient();
  // One extra day so the oldest chart day is whole in any time zone.
  const since = new Date(now.getTime() - (CHART_DAYS + 1) * 24 * 60 * 60 * 1000).toISOString();

  const [profile, cards, reviews, answers, sessions] = await Promise.all([
    supabase
      .from("profiles")
      .select("timezone")
      .eq("id", userId)
      .maybeSingle<{ timezone: string }>(),
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
        .range(from, to),
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
