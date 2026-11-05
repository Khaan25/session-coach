"use server";

import { profileUpdateSchema } from "@session-coach/shared/profile";
import { revalidatePath } from "next/cache";

import { saveProjectLevel } from "@/lib/projects/save";
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
  if (parsed.data.timezone) {
    // Marks the time zone as the learner's choice, even UTC, so adoptBrowserTimezone never replaces it.
    const { error: markError } = await supabase.auth.updateUser({
      data: { [TIMEZONE_CHOSEN]: true },
    });
    if (markError) console.error("[settings/updateProfile] mark timezone", markError.message);
  }

  revalidatePath("/settings");
  return { error: null };
}

/**
 * Sets how hard the questions are for one of the learner's repos, from the dashboard prompt or /settings, and marks
 * the project onboarded. Applies to sessions processed from now on; existing cards keep their questions.
 *
 * @param input - `{ repo, question_level }`.
 * @returns `{ error }` with a learner-readable message, or `{ error: null }` when saved.
 */
export async function setProjectLevel(input: unknown): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { error: "You're signed out. Sign in and try again." };

  const result = await saveProjectLevel(supabase, userId, input);
  if (!result.error) {
    revalidatePath("/settings");
    revalidatePath("/dashboard");
  }
  return result;
}

/** How long after sign-up the browser's time zone may replace the UTC default: one day, so it never undoes a choice. */
const DETECT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Auth `user_metadata` key set once the learner saves a time zone in Settings. */
const TIMEZONE_CHOSEN = "timezone_chosen";

/**
 * Sets a new learner's time zone from their browser, so "due today" and the reminder email use their day from the
 * start. Only while the profile still holds the UTC default, the learner never saved a time zone in Settings, and the
 * account is under a day old; after that, only /settings changes it. Silent: a failure leaves UTC, which Settings can
 * still fix. Refreshes the layout when it changed the row, so the sidebar's due count uses the new day.
 *
 * @param timezone - `Intl.DateTimeFormat().resolvedOptions().timeZone` from the browser.
 */
export async function adoptBrowserTimezone(timezone: unknown): Promise<void> {
  const parsed = profileUpdateSchema.pick({ timezone: true }).required().safeParse({ timezone });
  if (!parsed.success || parsed.data.timezone === "UTC") return;

  const supabase = await createClient();
  // getUser, not getClaims: the token's user_metadata is stale until it refreshes, right after a save in Settings.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.[TIMEZONE_CHOSEN] === true) return;

  const { data, error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id)
    .eq("timezone", "UTC")
    .gt("created_at", new Date(Date.now() - DETECT_WINDOW_MS).toISOString())
    .select("id");
  if (error) console.error("[settings/adoptBrowserTimezone] failed", error.message);
  else if (data.length > 0) revalidatePath("/", "layout");
}
