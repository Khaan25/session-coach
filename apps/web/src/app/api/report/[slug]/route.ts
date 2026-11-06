import { NextResponse } from "next/server";

import { NO_STORE, serverError } from "@/lib/api/http";
import { authAttemptWait } from "@/lib/auth/rate-limit";
import { getReport } from "@/lib/report/queries";

/**
 * GET /api/report/[slug]: a learner's public ownership report as JSON (`Report` in lib/report/report.ts). No sign-in.
 * Off, unknown and malformed slugs all get the same 404 body, so a link can't be probed. Never cached: switching the
 * report off must take effect at once.
 */
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const wait = await authAttemptWait("report");
  if (wait > 0) {
    return NextResponse.json(
      { error: `Too many requests from this network. Try again in ${wait} min.` },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(wait * 60) } },
    );
  }
  try {
    const report = await getReport((await context.params).slug);
    if (!report) {
      return NextResponse.json(
        { error: "This report isn't shared." },
        { status: 404, headers: NO_STORE },
      );
    }
    return NextResponse.json(report, { headers: NO_STORE });
  } catch (error) {
    return serverError(
      "[api/report] get",
      error,
      "The report couldn't be loaded. Try again in a minute.",
      NO_STORE,
    );
  }
}
