"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

type Result = { error: string | null };

const toggleSchema = z.object({ id: z.uuid(), done: z.boolean() });

// Matches the table's checks: a title of 1 to 300 characters; details trimmed, and empty means none (null).
const editSchema = z
  .object({
    id: z.uuid(),
    title: z.string().trim().min(1).max(300).optional(),
    details: z
      .string()
      .trim()
      .max(20_000)
      .transform((value) => value || null)
      .optional(),
  })
  .refine((edit) => edit.title !== undefined || edit.details !== undefined);

/**
 * Updates one task through the RLS client: only tracker members match a row, and the column grants allow `done_at`,
 * `title` and `details` only. Returns a readable error, never the database's.
 *
 * @param id - The task.
 * @param patch - The columns to change.
 * @param what - For the log line.
 */
async function updateTask(
  id: string,
  patch: { done_at?: string | null; title?: string; details?: string | null },
  what: string,
): Promise<Result> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) return { error: "You're signed out. Sign in and try again." };

  const { data, error } = await supabase
    .from("tracker_tasks")
    .update(patch)
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    console.error(`[tracker/${what}] failed`, error ?? "no row updated");
    return { error: "That task couldn't be saved. Try again." };
  }

  revalidatePath("/tracker");
  return { error: null };
}

/**
 * Ticks or unticks one tracker task. `done_by` is set by a trigger to whoever ticked it.
 *
 * @param input - `{ id, done }`.
 * @returns `{ error }` with a readable message, or `{ error: null }` when saved.
 */
export async function setTaskDone(input: unknown): Promise<Result> {
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { error: "That task couldn't be updated." };
  const { id, done } = parsed.data;
  return updateTask(id, { done_at: done ? new Date().toISOString() : null }, "setTaskDone");
}

/**
 * Saves an edited title or details (Markdown). An emptied details box removes the details.
 *
 * @param input - `{ id, title? , details? }`; at least one of the two.
 * @returns `{ error }` with a readable message, or `{ error: null }` when saved.
 */
export async function editTask(input: unknown): Promise<Result> {
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "A title needs 1 to 300 characters, and details at most 20,000." };
  }
  const { id, ...patch } = parsed.data;
  return updateTask(id, patch, "editTask");
}
