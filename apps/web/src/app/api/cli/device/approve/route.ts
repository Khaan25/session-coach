/**
 * POST /api/cli/device/approve `{ userCode }`: the signed-in learner approves a CLI login, same-origin only. The CLI's
 * next poll of /api/cli/device/token collects a new token labelled with its device name. See `decideDeviceCode`.
 */
import type { NextRequest } from "next/server";

import { decideDeviceCode } from "@/lib/tokens/device-codes";

export function POST(request: NextRequest) {
  return decideDeviceCode(request, "approve");
}
