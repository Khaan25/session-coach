/**
 * POST /api/cli/device/deny `{ userCode }`: the signed-in learner refuses a CLI login, same-origin only. The CLI's
 * next poll gets `access_denied`. See `decideDeviceCode`.
 */
import type { NextRequest } from "next/server";

import { decideDeviceCode } from "@/lib/tokens/device-codes";

export function POST(request: NextRequest) {
  return decideDeviceCode(request, "deny");
}
