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
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});
