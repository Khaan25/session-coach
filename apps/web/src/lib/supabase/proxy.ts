import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { safeNext } from "@/lib/auth/safe-next";
import { supabaseEnv } from "@/lib/supabase/env";

// Signed-out visitors to these go to /login?next=… . A prefix match on whole path segments.
const PROTECTED = ["/dashboard", "/s", "/review", "/progress", "/settings", "/setup"];
// Signed-in visitors to these go on to where they were headed.
const SIGNED_OUT_ONLY = ["/login", "/sign-up"];

/** Whether `pathname` is one of `prefixes` or under one, so `/s` matches `/s/abc` but not `/setup`. */
function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refreshes the Supabase session on every matched request (the only place it refreshes, docs/plans/auth.md #19) and
 * routes by sign-in state. Cookies and cache headers the refresh sets are copied onto whatever response goes back.
 *
 * @param request - The incoming request.
 * @returns The pass-through response, or a redirect carrying the refreshed cookies.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet)
          response.cookies.set(name, value, options);
        // Cache-Control: private, no-store so a CDN never caches a response that sets a session cookie (#20).
        for (const [header, value] of Object.entries(headers)) response.headers.set(header, value);
      },
    },
  });

  // Nothing may run between creating the client and getClaims(), or a refresh can be lost.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname, search, origin } = request.nextUrl;

  let target: URL | null = null;
  if (!signedIn && matches(pathname, PROTECTED)) {
    target = new URL("/login", origin);
    target.searchParams.set("next", `${pathname}${search}`);
  } else if (signedIn && matches(pathname, SIGNED_OUT_ONLY)) {
    target = new URL(safeNext(request.nextUrl.searchParams.get("next"), origin), origin);
  }
  if (!target) return response;

  // A fresh redirect response drops what setAll wrote, so copy the refreshed cookies and no-store headers across.
  const redirect = NextResponse.redirect(target);
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = response.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}
