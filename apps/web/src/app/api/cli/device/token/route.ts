/**
 * POST /api/cli/device/token `{ deviceCode }`: the CLI polls here until the learner decides (RFC 8628 section 3.4/3.5).
 * No auth: the device code is the credential, looked up by its sha256.
 *   200 `{ token, email }` once, after approval: a new cli_tokens row labelled with the device name.
 *   400 `{ error }` with an RFC 8628 code: authorization_pending, slow_down (interval grows by 5 s), expired_token
 *   (unknown, expired or already collected), access_denied; or `{ error, field }` for a bad body.
 *   429 too many polls from this IP (`Retry-After`), 500 else. Never cached; the token and code are never logged.
 */
import { NextResponse, type NextRequest } from "next/server";

import { authAttemptWait } from "@/lib/auth/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createToken } from "@/lib/tokens/create";
import {
  DEVICE_COLUMNS,
  devicePollSchema,
  pollOutcome,
  slowerInterval,
  type DeviceRow,
} from "@/lib/tokens/device";
import { NO_STORE } from "@/lib/tokens/device-codes";
import { hashToken } from "@/lib/tokens/hash";

function rfcError(error: string) {
  return NextResponse.json({ error }, { status: 400, headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = devicePollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "deviceCode is missing or malformed", field: "deviceCode" },
      { status: 400, headers: NO_STORE },
    );
  }

  const wait = await authAttemptWait("devicePoll");
  if (wait > 0) {
    return NextResponse.json(
      { error: "slow_down" },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(wait * 60) } },
    );
  }

  try {
    const admin = createAdminClient();
    // Looked up by hash: the raw code is never stored, so there is no stored secret to compare in a timing-sensitive way.
    const { data: row, error } = await admin
      .from("cli_device_codes")
      .select(DEVICE_COLUMNS)
      .eq("device_code_hash", hashToken(parsed.data.deviceCode))
      .maybeSingle<DeviceRow>();
    if (error) throw new Error(error.message);
    if (!row) return rfcError("expired_token");

    const now = new Date();
    const outcome = pollOutcome(row, now);
    if (outcome === "access_denied" || outcome === "expired_token") return rfcError(outcome);

    if (outcome === "slow_down") {
      const { error: slowError } = await admin
        .from("cli_device_codes")
        .update({
          poll_interval: slowerInterval(row.poll_interval),
          last_polled_at: now.toISOString(),
        })
        .eq("id", row.id);
      if (slowError) throw new Error(slowError.message);
      return rfcError("slow_down");
    }

    if (outcome === "authorization_pending") {
      const { error: pollError } = await admin
        .from("cli_device_codes")
        .update({ last_polled_at: now.toISOString() })
        .eq("id", row.id);
      if (pollError) throw new Error(pollError.message);
      return rfcError("authorization_pending");
    }

    // outcome === "issue". Claim it with a compare-and-set, so two polls racing can't both mint a token.
    const { data: claimed, error: claimError } = await admin
      .from("cli_device_codes")
      .update({ token_issued_at: now.toISOString(), last_polled_at: now.toISOString() })
      .eq("id", row.id)
      .is("token_issued_at", null)
      .select("approved_by")
      .maybeSingle<{ approved_by: string }>();
    if (claimError) throw new Error(claimError.message);
    if (!claimed) return rfcError("expired_token");

    try {
      const [created, profile] = await Promise.all([
        createToken(claimed.approved_by, row.client_name),
        admin
          .from("profiles")
          .select("email")
          .eq("id", claimed.approved_by)
          .maybeSingle<{ email: string | null }>(),
      ]);
      return NextResponse.json(
        { token: created.token, email: profile.data?.email ?? null },
        { headers: NO_STORE },
      );
    } catch (err) {
      // Release the claim so the next poll can try again; the code is still approved and unexpired.
      await admin.from("cli_device_codes").update({ token_issued_at: null }).eq("id", row.id);
      throw err;
    }
  } catch (err) {
    console.error("[api/cli/device/token] poll failed", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Couldn't check the login. Try again." },
      { status: 500, headers: NO_STORE },
    );
  }
}
