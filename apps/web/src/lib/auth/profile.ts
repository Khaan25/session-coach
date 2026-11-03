import "server-only";

import { profileSchema } from "@session-coach/shared/profile";
import { cache } from "react";
import type { z } from "zod";

import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

const viewSchema = profileSchema.pick({
  email: true,
  display_name: true,
  timezone: true,
  notify_email: true,
});

/** The signed-in learner's profile as the app shows it. */
export type ProfileView = z.infer<typeof viewSchema>;

/**
 * The signed-in learner's profile row, read through RLS. Memoized per request. Never `"use cache"` this: it is one
 * learner's data, and with cacheComponents a caller must render it inside `<Suspense>`.
 *
 * @returns The profile, or null when nobody is signed in or the row doesn't exist yet.
 * @throws When the query fails or the row doesn't match the shared schema.
 */
export const getProfile = cache(async (): Promise<ProfileView | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("email, display_name, timezone, notify_email")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error(`getProfile: ${error.message}`);
  return data ? viewSchema.parse(data) : null;
});
