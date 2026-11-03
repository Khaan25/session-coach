// Saving a project's question level for the signed-in learner. Takes the client, so tests pass a fake.

import { projectLevelUpdateSchema } from "@session-coach/shared/project";
import type { SupabaseClient } from "@supabase/supabase-js";

type Result = { error: string | null };

/**
 * Sets the level for one of the learner's repos and marks it onboarded: updates the row, or inserts it the first time.
 * Not a PostgREST upsert, because that writes user_id and repo on conflict and learners may update only
 * question_level and onboarded_at (column grants). RLS still decides: a learner can insert only their own row, for a
 * repo they have a session in.
 *
 * @param supabase - The learner's RLS client.
 * @param userId - From the verified session, never from the input.
 * @param input - `{ repo, question_level }`, unvalidated.
 * @param now - When they chose; becomes `onboarded_at`.
 */
export async function saveProjectLevel(
  supabase: SupabaseClient,
  userId: string,
  input: unknown,
  now: Date = new Date(),
): Promise<Result> {
  const parsed = projectLevelUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: "Pick simple, hard or complex and try again." };
  const { repo, question_level } = parsed.data;
  const values = { question_level, onboarded_at: now.toISOString() };

  const update = () =>
    supabase.from("projects").update(values).eq("user_id", userId).eq("repo", repo).select("id");

  const updated = await update();
  if (updated.error) return failed(updated.error);
  if (updated.data.length > 0) return { error: null };

  const inserted = await supabase.from("projects").insert({ user_id: userId, repo, ...values });
  if (!inserted.error) return { error: null };
  // Another tab inserted it first: update that row instead.
  if (inserted.error.code === "23505") {
    const retried = await update();
    if (!retried.error && retried.data.length > 0) return { error: null };
    return failed(retried.error ?? "no row updated");
  }
  // RLS: no session in this repo, so it isn't one of the learner's projects.
  if (inserted.error.code === "42501") return { error: "That project isn't one of yours." };
  return failed(inserted.error);
}

function failed(cause: unknown): Result {
  console.error("[projects/saveProjectLevel] failed", cause);
  return { error: "The question level couldn't be saved. Try again." };
}
