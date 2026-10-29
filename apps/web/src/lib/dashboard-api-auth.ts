import { timingSafeEqual } from "node:crypto";
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
 * Compares two secrets without leaking how many leading characters match through timing.
 * The length check comes first because timingSafeEqual throws on buffers of different sizes.
 */
function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}
