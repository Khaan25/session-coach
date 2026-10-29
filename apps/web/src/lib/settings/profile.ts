import "server-only";

import { getCurrentUser } from "@/lib/auth/current-user";
import { getProfile } from "@/lib/auth/profile";

/**
 * The signed-in learner's settings: the fields /settings and the sidebar show, from the memoized, schema-checked
 * getProfile(), so a page and its layout read the row once.
 *
 * @returns The profile, or null when nobody is signed in or the row is missing.
 * @throws When the query fails or the row doesn't match the shared schema.
 */
export async function getSettingsProfile() {
  const [user, profile] = await Promise.all([getCurrentUser(), getProfile()]);
  if (!user || !profile) return null;
  const { display_name, email, timezone, notify_email } = profile;
  // The trigger copies the email in; fall back to the claim if it hasn't yet.
  return { display_name, email: email ?? user.email, timezone, notify_email };
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
