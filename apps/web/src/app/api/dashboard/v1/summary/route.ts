/**
 * GET /api/dashboard/v1/summary: headline counts for the stats dashboard.
 * Contract and field rules: docs/PLAY_API.md. Auth: requireDashboardKey().
 * Optional fields are omitted when unanswerable, never zeroed.
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardKey } from "@/lib/dashboard-api-auth";
import { buildRetentionCohorts, countNewUsers } from "@/lib/play-stats";
import { createAdminClient } from "@/lib/supabase/admin";

const PLAY = process.env.PLAY_SLUG ?? "session-coach";

export async function GET(req: NextRequest) {
  const denied = requireDashboardKey(req);
  if (denied) return denied;

  try {
    const now = new Date();
    const supabase = createAdminClient();
    // shortcut: reads every profile and activity row; move to SQL aggregates past ~10k users.
    const profiles = await supabase.from("profiles").select("id, created_at");
    if (profiles.error) throw profiles.error;
    const rows = profiles.data;
    const createdAt = rows.map((p) => p.created_at);

    const body: Record<string, unknown> = {
      play: PLAY,
      users_total: rows.length,
      users_by_plan: { free: rows.length },
      new_users_7d: countNewUsers(createdAt, now, 7),
      new_users_30d: countNewUsers(createdAt, now, 30),
      generated_at: now.toISOString(),
    };

    // Retention is the expensive, optional part: a failure omits it instead of failing the summary.
    try {
      const since = new Date(now.getTime() - 120 * 86_400_000).toISOString();
      const [uploads, answers] = await Promise.all([
        supabase.from("sessions").select("user_id, created_at").gte("created_at", since),
        supabase.from("answers").select("user_id, created_at").gte("created_at", since),
      ]);
      if (uploads.error) throw uploads.error;
      if (answers.error) throw answers.error;
      const cohorts = buildRetentionCohorts(rows, [...uploads.data, ...answers.data], now);
      if (cohorts.length > 0) body.retention = { cohorts };
    } catch (err) {
      console.error("[api/dashboard/v1/summary] retention omitted", err);
    }

    return NextResponse.json(body);
  } catch (err) {
    console.error("[api/dashboard/v1/summary] failed", err);
    return NextResponse.json({ error: "Failed to compute summary" }, { status: 500 });
  }
}
