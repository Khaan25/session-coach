"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const toggleSchema = z.object({ id: z.uuid(), done: z.boolean() });

/**
 * Ticks or unticks one tracker task. Goes through the RLS client: only tracker members match a row, and the column
 * grants let them change `done_at` and `done_by` only.
 *
 * @param input - `{ id, done }`.
 * @returns `{ error }` with a readable message, or `{ error: null }` when saved.
 */
export async function setTaskDone(input: unknown): Promise<{ error: string | null }> {
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { error: "That task couldn't be updated." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { error: "You're signed out. Sign in and try again." };

  const { id, done } = parsed.data;
  const { data, error } = await supabase
    .from("tracker_tasks")
    .update(
      done
        ? { done_at: new Date().toISOString(), done_by: userId }
        : { done_at: null, done_by: null },
    )
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    console.error("[tracker/setTaskDone] failed", error ?? "no row updated");
    return { error: "That task couldn't be updated. Try again." };
  }

  revalidatePath("/tracker");
  return { error: null };
}
