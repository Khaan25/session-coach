/**
 * GET /api/dashboard/v1/summary: headline counts for the stats dashboard.
 * Contract and field rules: docs/PLAY_API.md. Auth: requireDashboardKey().
 * Optional fields are omitted when unanswerable, never zeroed.
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardKey } from "@/lib/dashboard-api-auth";
import { buildRetentionCohorts } from "@/lib/play-stats";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/supabase/fetch-all";

/** Which play this deployment reports as on the stats dashboard. */
const PLAY = process.env.PLAY_SLUG ?? "session-coach";
const DAY_MS = 86_400_000;
/** Cohorts and activity are read for this many days; every window of these cohorts falls inside it. */
const RETENTION_DAYS = 120;

export async function GET(req: NextRequest) {
  const denied = requireDashboardKey(req);
  if (denied) return denied;

  try {
    const now = new Date();
    const supabase = createAdminClient();
    const daysAgo = (days: number) => new Date(now.getTime() - days * DAY_MS).toISOString();
    // Exact counts in Postgres: no row limit applies to them.
    const countProfiles = (since?: string) => {
      const query = supabase.from("profiles").select("id", { count: "exact", head: true });
      return since ? query.gte("created_at", since) : query;
    };
    const [total, last7, last30] = await Promise.all([
      countProfiles(),
      countProfiles(daysAgo(7)),
      countProfiles(daysAgo(30)),
    ]);
    for (const result of [total, last7, last30]) if (result.error) throw result.error;
    const usersTotal = total.count ?? 0;

    const body: Record<string, unknown> = {
      play: PLAY,
      users_total: usersTotal,
      users_by_plan: { free: usersTotal },
      new_users_7d: last7.count ?? 0,
      new_users_30d: last30.count ?? 0,
      generated_at: now.toISOString(),
    };

    // Retention is the expensive, optional part: a failure omits it instead of failing the summary.
    try {
      const since = daysAgo(RETENTION_DAYS);
      const [cohorts, uploads, answers] = await Promise.all([
        fetchAll<{ id: string; created_at: string }>((from, to) =>
          supabase
            .from("profiles")
            .select("id, created_at")
            .gte("created_at", since)
            .order("id")
            .range(from, to),
        ),
        fetchAll<{ user_id: string; created_at: string }>((from, to) =>
          supabase
            .from("sessions")
            .select("user_id, created_at")
            .gte("created_at", since)
            .order("id")
            .range(from, to),
        ),
        fetchAll<{ user_id: string; created_at: string }>((from, to) =>
          supabase
            .from("answers")
            .select("user_id, created_at")
            .gte("created_at", since)
            .order("id")
            .range(from, to),
        ),
      ]);
      const retention = buildRetentionCohorts(cohorts, [...uploads, ...answers], now);
      if (retention.length > 0) body.retention = { cohorts: retention };
    } catch (err) {
      console.error("[api/dashboard/v1/summary] retention omitted", err);
    }

    return NextResponse.json(body);
  } catch (err) {
    console.error("[api/dashboard/v1/summary] failed", err);
    return NextResponse.json({ error: "Failed to compute summary" }, { status: 500 });
  }
}
