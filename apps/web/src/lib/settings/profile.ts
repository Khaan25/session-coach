import "server-only";

import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in learner's settings, read through RLS. Columns by name: only what /settings shows.
 *
 * @returns The profile, or null when nobody is signed in or the row is missing.
 */
export async function getSettingsProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, email, timezone, notify_email")
    .eq("id", user.id)
    .maybeSingle<{
      display_name: string | null;
      email: string | null;
      timezone: string;
      notify_email: boolean;
    }>();
  if (error) throw error;
  if (!data) return null;
  // The trigger copies the email in; fall back to the claim if it hasn't yet.
  return { ...data, email: data.email ?? user.email };
}

/**
 * Every IANA time zone the runtime knows, plus the learner's own if the runtime calls it something else (an alias
 * such as "Asia/Calcutta"), so the select can always show the saved value.
 *
 * @param current - The learner's saved time zone.
 * @returns Time zone names, sorted.
 */
export function timeZoneOptions(current: string) {
  return [...new Set(["UTC", current, ...Intl.supportedValuesOf("timeZone")])].sort();
}
