import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Guard for the Play Stats API (/api/dashboard/v1/*), adapted from 8xsocial/template-monorepo (MIT).
 * The stats dashboard calls with `Authorization: Bearer <DASHBOARD_API_KEY>`.
 * Returns a response to short-circuit with, or null when authorized. With no key set the API
 * is disabled (503), so a deploy without the secret exposes nothing.
 */
export function requireDashboardKey(req: NextRequest): NextResponse | null {
  const expected = process.env.DASHBOARD_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "Dashboard API is not configured on this deployment" },
      { status: 503 },
    );
  }

  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!provided || !constantTimeEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * Compares two secrets without leaking, through timing, how many leading characters match or how long the key is.
 * Both sides are hashed first so timingSafeEqual always compares two 32-byte digests.
 */
function constantTimeEqual(a: string, b: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}
