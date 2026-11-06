import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/database.types";

import { supabaseEnv } from "@/lib/supabase/env";

/**
 * The signed-in learner's client for client components (Realtime, direct profile updates).
 *
 * @returns A browser Supabase client; RLS applies.
 */
export function createClient() {
  const { url, key } = supabaseEnv();
  // A shared synthetic preview keeps browser traffic on its public origin; server reads stay on loopback.
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DESIGN_SHARE === "1" &&
    typeof window !== "undefined"
  ) {
    return createBrowserClient<Database>(window.location.origin + "/__design/fixtures", key, {
      cookieOptions: { name: "sb-127-auth-token", secure: window.location.protocol === "https:" },
    });
  }
  return createBrowserClient<Database>(url, key);
}
