/**
 * GET /api/cli/me: who a CLI token belongs to, so `session-coach login` checks a token before saving it.
 *   200 `{ email }` (null when the profile has none), 401 missing or unknown token, 500 anything else.
 * Auth: `Authorization: Bearer sc_…`, a CLI token from /setup. Never log the token.
 */
import { NextResponse } from "next/server";

import { bearerToken } from "@/lib/sessions/upload";
import { createAdminClient } from "@/lib/supabase/admin";
import { userForToken } from "@/lib/tokens/verify";

export async function GET(request: Request) {
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) return NextResponse.json({ error: "Missing CLI token" }, { status: 401 });

  try {
    const userId = await userForToken(token);
    if (!userId) {
      return NextResponse.json(
        { error: "Unknown CLI token. Run session-coach login again." },
        { status: 401 },
      );
    }
    const { data, error } = await createAdminClient()
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle<{ email: string | null }>();
    if (error) throw new Error(error.message);
    return NextResponse.json({ email: data?.email ?? null });
  } catch (err) {
    console.error("[api/cli/me] lookup failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't check the token. Try again." }, { status: 500 });
  }
}
