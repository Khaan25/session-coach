import { type NextRequest, NextResponse } from "next/server";

import { safeNext } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/server";

/**
 * Google (OAuth) comes back here with a one-time `code`. Exchanging it for a session needs the PKCE cookie this
 * browser got when sign-in started, so redirect URLs are always built on this request's own origin (#10, #13).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  // The provider's own error code, e.g. access_denied when the learner cancels. Never its free-text description.
  const providerError = searchParams.get("error");

  if (!code) {
    const reason = providerError === "access_denied" ? "access_denied" : "oauth_failed";
    return NextResponse.redirect(new URL(`/auth/error?code=${reason}`, origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("auth/callback", error);
    return NextResponse.redirect(new URL("/auth/error?code=oauth_failed", origin));
  }
  return NextResponse.redirect(new URL(safeNext(searchParams.get("next"), origin), origin));
}
