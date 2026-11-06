/**
 * GET /api/cli/me: who a CLI token belongs to, so `session-coach login` checks a token before saving it.
 *   200 `{ email }` (null when the profile has none), 401 missing or unknown token, 500 anything else.
 * Auth: `Authorization: Bearer sc_…`, a CLI token from /setup. Never log the token.
 */
import { NextResponse } from "next/server";

import { requireCliUser, serverError } from "@/lib/api/http";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const userId = await requireCliUser(request);
    if (userId instanceof NextResponse) return userId;
    const { data, error } = await createAdminClient()
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return NextResponse.json({ email: data?.email ?? null });
  } catch (err) {
    return serverError("[api/cli/me] lookup", err, "Couldn't check the token. Try again.");
  }
}
