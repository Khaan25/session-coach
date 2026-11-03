/**
 * POST /api/cli/device `{ clientName }`: starts a CLI device-code login (RFC 8628 section 3.1). No auth: the CLI has no
 * token yet.
 *   200 `{ deviceCode, userCode, verificationUri, verificationUriComplete, expiresIn, interval }`. `deviceCode` is the
 *   polling secret (only its sha256 is stored); `userCode` is what the learner checks on /cli/approve.
 *   400 bad clientName, 429 too many starts from this IP (`Retry-After`), 500 else. Never cached, never logged.
 */
import { NextResponse, type NextRequest } from "next/server";

import { authAttemptWait } from "@/lib/auth/rate-limit";
import { clientIp } from "@/lib/auth/client-ip";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEVICE_CODE_TTL_SECONDS,
  deviceStartSchema,
  formatUserCode,
  newDeviceCode,
  newUserCode,
  POLL_INTERVAL_SECONDS,
} from "@/lib/tokens/device";
import { NO_STORE } from "@/lib/tokens/device-codes";
import { hashToken } from "@/lib/tokens/hash";

/** Expired codes stay a day so /cli/approve can still say "expired" rather than "no such code". */
const KEEP_EXPIRED_MS = 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = deviceStartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "clientName must be 1 to 100 printable characters", field: "clientName" },
      { status: 400, headers: NO_STORE },
    );
  }

  const wait = await authAttemptWait("deviceStart");
  if (wait > 0) {
    return NextResponse.json(
      { error: `Too many logins from this network. Try again in ${wait} min.` },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(wait * 60) } },
    );
  }

  try {
    const admin = createAdminClient();
    const requestedAt = new Date();
    // Opportunistic cleanup: no cron needed for a table that only grows with logins.
    const { error: cleanupError } = await admin
      .from("cli_device_codes")
      .delete()
      .lt("expires_at", new Date(requestedAt.getTime() - KEEP_EXPIRED_MS).toISOString());
    if (cleanupError) console.error("[api/cli/device] cleanup failed", cleanupError.message);

    const deviceCode = newDeviceCode();
    const ip = clientIp(request.headers);
    let userCode = "";
    // 20^8 codes: a clash is near impossible, but the unique index turns one into a retry, never a shared code.
    for (let attempt = 0; attempt < 3 && !userCode; attempt++) {
      const candidate = newUserCode();
      const { error } = await admin.from("cli_device_codes").insert({
        device_code_hash: hashToken(deviceCode),
        user_code: candidate,
        client_name: parsed.data.clientName,
        requested_ip: ip === "unknown" ? null : ip.slice(0, 64),
        requested_at: requestedAt.toISOString(),
        expires_at: new Date(requestedAt.getTime() + DEVICE_CODE_TTL_SECONDS * 1000).toISOString(),
      });
      if (!error) userCode = candidate;
      else if (error.code !== "23505") throw new Error(error.message);
    }
    if (!userCode) throw new Error("no free user code after 3 tries");

    const verificationUri = `${request.nextUrl.origin}/cli/approve`;
    const shown = formatUserCode(userCode);
    return NextResponse.json(
      {
        deviceCode,
        userCode: shown,
        verificationUri,
        // The code in the URL only prefills the form: the page never approves without a click.
        verificationUriComplete: `${verificationUri}?code=${shown}`,
        expiresIn: DEVICE_CODE_TTL_SECONDS,
        interval: POLL_INTERVAL_SECONDS,
      },
      { headers: NO_STORE },
    );
  } catch (err) {
    console.error("[api/cli/device] start failed", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Couldn't start the login. Try again." },
      { status: 500, headers: NO_STORE },
    );
  }
}
