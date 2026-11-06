import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/supabase/fetch-all";

import { type DefenseRow, type OwnedRow, type Report, shapeReport } from "./report";

/** `profiles.report_slug`'s format (check constraint in 20261105000300_report.sql). */
export const SLUG = /^[0-9a-f]{32}$/;

/**
 * The public report for a slug, read with the service role: a stranger has no session, and the slug is the only key.
 * Only a profile `where report_on` counts, and every later read is filtered on that profile's id. Memoized per
 * request, so the page and its metadata read once.
 *
 * @param slug - From the URL, unchecked.
 * @returns The report, or null when the slug is malformed, unknown or switched off (the same answer for all three).
 * @throws When a query fails.
 */
export const getReport = cache(async (slug: string): Promise<Report | null> => {
  if (!SLUG.test(slug)) return null;
  const admin = createAdminClient();
  const profile = await admin
    .from("profiles")
    .select("id, display_name")
    .eq("report_slug", slug)
    .eq("report_on", true)
    .maybeSingle();
  if (profile.error) throw new Error(`getReport: ${profile.error.message}`);
  if (!profile.data) return null;
  const userId = profile.data.id;

  const projects = await admin
    .from("projects")
    .select("repo")
    .eq("user_id", userId)
    .eq("report_shown", true);
  if (projects.error) throw new Error(`getReport: ${projects.error.message}`);
  const shownRepos = projects.data.map(({ repo }) => repo);
  if (shownRepos.length === 0) return shapeReport(profile.data.display_name, [], [], []);

  const [owned, defenses] = await Promise.all([
    fetchAll<OwnedRow>((from, to) =>
      admin
        .from("reviews")
        .select(
          "card_id, updated_at, card:decision_cards!inner(decision, evidence, files, hidden, flagged, session:sessions!inner(repo))",
        )
        .eq("user_id", userId)
        .eq("mastered", true)
        .eq("card.hidden", false)
        .eq("card.flagged", false)
        .in("card.session.repo", shownRepos)
        .order("card_id")
        .range(from, to)
        .overrideTypes<OwnedRow[], { merge: false }>(),
    ),
    fetchAll<DefenseRow>((from, to) =>
      admin
        .from("defenses")
        .select("card_id, finished_at")
        .eq("user_id", userId)
        .eq("status", "finished")
        .eq("score", 2)
        .order("id")
        .range(from, to),
    ),
  ]);
  return shapeReport(profile.data.display_name, shownRepos, owned, defenses);
});

/** What /settings shows for the report: the switch, the slug and each repo's tick. */
export type ReportSettings = {
  on: boolean;
  slug: string;
  repos: { repo: string; shown: boolean }[];
};

/**
 * The signed-in learner's report settings, through the RLS client.
 *
 * @param userId - The signed-in learner.
 * @param repos - The learner's repos (`listProjects`), so a repo with no `projects` row is listed unticked.
 * @throws When a query fails.
 */
export async function getReportSettings(userId: string, repos: string[]): Promise<ReportSettings> {
  const supabase = await createClient();
  const [profile, projects] = await Promise.all([
    supabase.from("profiles").select("report_on, report_slug").eq("id", userId).single(),
    supabase.from("projects").select("repo, report_shown").eq("user_id", userId),
  ]);
  if (profile.error) throw new Error(`getReportSettings: ${profile.error.message}`);
  if (projects.error) throw new Error(`getReportSettings: ${projects.error.message}`);
  const shown = new Set(projects.data.filter((p) => p.report_shown).map((p) => p.repo));
  return {
    on: profile.data.report_on,
    slug: profile.data.report_slug,
    repos: repos.map((repo) => ({ repo, shown: shown.has(repo) })),
  };
}
