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
  return createBrowserClient<Database>(url, key);
}
