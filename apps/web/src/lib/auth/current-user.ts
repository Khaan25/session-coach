import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in learner's id and email from the verified JWT claims. Use `getUser()` instead
 * before sensitive writes (grading, token creation, account deletion). Memoized per request.
 *
 * @returns The claims, or null when nobody is signed in.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  // An auth-server or key failure reads as signed out; log it so it isn't silent.
  if (error) console.error("getCurrentUser: getClaims", error);
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});
