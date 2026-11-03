import "server-only";

import type { QuestionLevel } from "@session-coach/shared/project";

import { createClient } from "@/lib/supabase/server";

import { levelOrDefault } from "./level";

/** One repo the learner has sessions in, with its level. `onboarded` is false until they first choose one. */
export type ProjectListItem = { repo: string; question_level: QuestionLevel; onboarded: boolean };

/**
 * Every repo the learner has a session in, A to Z, with its question level. A repo with no `projects` row yet is
 * listed at the default level and not onboarded. Sessions with no repo aren't a project and aren't listed.
 * Reads through the RLS client; the caller passes the signed-in learner's id (from getCurrentUser).
 *
 * @throws When either query fails.
 */
export async function listProjects(userId: string): Promise<ProjectListItem[]> {
  const supabase = await createClient();
  const [repos, projects] = await Promise.all([
    supabase.rpc("learner_repos"),
    supabase.from("projects").select("repo, question_level, onboarded_at").eq("user_id", userId),
  ]);
  if (repos.error) throw new Error(`listProjects: ${repos.error.message}`);
  if (projects.error) throw new Error(`listProjects: ${projects.error.message}`);
  const byRepo = new Map(projects.data.map((row) => [row.repo as string, row]));
  return ((repos.data ?? []) as { repo: string }[]).map(({ repo }) => {
    const row = byRepo.get(repo);
    return {
      repo,
      question_level: levelOrDefault(row?.question_level),
      onboarded: Boolean(row?.onboarded_at),
    };
  });
}
