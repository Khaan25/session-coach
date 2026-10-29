import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

import { supabaseEnv } from "@/lib/supabase/env";

/**
 * The signed-in learner's client for Server Components, Server Actions and route handlers. RLS
 * applies. Create one per request, never at module scope (Fluid compute shares module state).
 *
 * @returns A Supabase client that reads and writes the session cookies.
 */
export async function createClient() {
  // auth-js reads the clock as it loads the session; this stops prerendering first, so learner data is per request.
  await connection();
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet)
            cookieStore.set(name, value, options);
        } catch {
          // Server Components can't set cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}
