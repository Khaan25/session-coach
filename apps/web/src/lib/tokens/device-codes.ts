import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { NO_STORE, requireUser, serverError } from "@/lib/api/http";
import { tooManyRequests, userRateLimit } from "@/lib/auth/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  codeState,
  DEVICE_COLUMNS,
  isSameOrigin,
  normalizeUserCode,
  userCodeSchema,
  type DeviceRow,
} from "@/lib/tokens/device";

/**
 * One device code by the user code a learner typed, with the service role (learners can't read the table).
 *
 * @param userCode - Already normalized by `normalizeUserCode`.
 * @returns The row, or null when no stored code matches.
 */
export async function findDeviceCode(userCode: string): Promise<DeviceRow | null> {
  const { data, error } = await createAdminClient()
    .from("cli_device_codes")
    .select(DEVICE_COLUMNS)
    .eq("user_code", userCode)
    .maybeSingle();
  if (error) throw new Error(`findDeviceCode: ${error.message}`);
  return data;
}

const REFUSED: Record<string, { status: number; error: string }> = {
  missing: { status: 404, error: "That code doesn't match a login. Check your terminal." },
  expired: { status: 410, error: "That code expired. Run session-coach login again." },
  approved: { status: 409, error: "That login was already approved." },
  used: { status: 409, error: "That login was already used." },
  denied: { status: 409, error: "That login was already denied." },
};

/**
 * POST /api/cli/device/approve and /deny: the signed-in learner decides one pending code.
 *
 * Order: same-origin (CSRF), `getUser()` (the auth server, since approving mints a token), body, the learner's
 * deviceDecide budget (user codes can't be guessed by a script), then one compare-and-set update that only matches an
 * unexpired, undecided code. When it matches nothing, a read says why.
 *
 * @param request - JSON body `{ userCode }`.
 * @param decision - Which one the route records.
 * @returns 200 `{ status: "approved" | "denied" }`; 400 bad code; 401 signed out; 403 cross-site; 404 unknown code;
 *   409 already decided; 410 expired; 429 over budget; 500 else.
 */
export async function decideDeviceCode(request: NextRequest, decision: "approve" | "deny") {
  const route = `[api/cli/device/${decision}]`;
  if (!isSameOrigin(request.headers, request.nextUrl.origin)) {
    return NextResponse.json(
      { error: "Cross-site request refused" },
      { status: 403, headers: NO_STORE },
    );
  }

  const signedIn = await requireUser(NO_STORE);
  if (signedIn instanceof NextResponse) return signedIn;
  const { user } = signedIn;

  const body: unknown = await request.json().catch(() => null);
  const parsed = userCodeSchema.safeParse(body);
  const userCode = parsed.success ? normalizeUserCode(parsed.data.userCode) : null;
  if (!userCode) {
    return NextResponse.json(
      { error: "Enter the 8-letter code from your terminal", field: "userCode" },
      { status: 400, headers: NO_STORE },
    );
  }

  const limited = await userRateLimit("deviceDecide", user.id);
  if (limited) return tooManyRequests(limited);

  try {
    const now = new Date();
    const stamp = now.toISOString();
    const changes =
      decision === "approve" ? { approved_by: user.id, approved_at: stamp } : { denied_at: stamp };
    // Compare-and-set: two tabs, or approve racing deny, can't both win.
    const { data, error } = await createAdminClient()
      .from("cli_device_codes")
      .update(changes)
      .eq("user_code", userCode)
      .gt("expires_at", stamp)
      .is("approved_at", null)
      .is("denied_at", null)
      .select("id");
    if (error) throw new Error(error.message);
    if (data.length === 1) {
      return NextResponse.json(
        { status: decision === "approve" ? "approved" : "denied" },
        { headers: NO_STORE },
      );
    }

    const row = await findDeviceCode(userCode);
    const refused = REFUSED[row ? codeState(row, now) : "missing"] ?? REFUSED.missing;
    return NextResponse.json(
      { error: refused.error, field: "userCode" },
      { status: refused.status, headers: NO_STORE },
    );
  } catch (err) {
    return serverError(route, err, "That couldn't be saved. Try again.", NO_STORE);
  }
}
