"use server";

import { profileUpdateSchema } from "@session-coach/shared/profile";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/**
 * Saves the learner's display name, time zone and email reminders: the only profile columns they may write (column
 * grants). Goes through the RLS client, so it can only touch their own row.
 *
 * @param input - Any of display_name (null clears it, never ""), timezone and notify_email.
 * @returns `{ error }` with a learner-readable message, or `{ error: null }` when saved.
 */
export async function updateProfile(input: unknown): Promise<{ error: string | null }> {
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join(".") || "profile";
    return { error: `Check the ${field.replace("_", " ")} and try again.` };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { error: "You're signed out. Sign in and try again." };

  const { data, error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", userId)
    .select("id");
  if (error || !data?.length) {
    console.error("[settings/updateProfile] failed", error ?? "no row updated");
    return { error: "Your profile couldn't be saved. Try again." };
  }

  revalidatePath("/settings");
  return { error: null };
}
