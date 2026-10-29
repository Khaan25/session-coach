/**
 * GET /api/dashboard/v1/users: the user roster, paginated with `?limit=` and `?cursor=`.
 * Contract and filters: docs/PLAY_API.md. Auth: requireDashboardKey().
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardKey } from "@/lib/dashboard-api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const PLANS = ["free", "premium", "trial", "granted", "promo", "sandbox"];
// No billing and no checkout yet: `purchase` truthfully lists nobody; `checkout` isn't tracked.
const STAGES = ["purchase"];

export async function GET(req: NextRequest) {
  const denied = requireDashboardKey(req);
  if (denied) return denied;

  const params = req.nextUrl.searchParams;
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(params.get("limit") ?? "", 10) || DEFAULT_LIMIT),
  );
  const page = Math.max(1, Number.parseInt(params.get("cursor") ?? "", 10) || 1);
  const plan = params.get("plan");
  const stage = params.get("stage");

  if (stage && !STAGES.includes(stage)) {
    return NextResponse.json(
      { error: `Unsupported stage "${stage}". This play answers: ${STAGES.join(", ")}` },
      { status: 400 },
    );
  }
  if (plan && !PLANS.includes(plan)) {
    return NextResponse.json(
      { error: `Unknown plan "${plan}". This play answers: ${PLANS.join(", ")}` },
      { status: 400 },
    );
  }
  // Everyone is on the free plan, so any other plan or the purchase stage is an empty roster.
  if (stage || (plan && plan !== "free")) {
    return NextResponse.json({ users: [], next_cursor: null });
  }

  try {
    const supabase = createAdminClient();
    const from = (page - 1) * limit;
    const profiles = await supabase
      .from("profiles")
      .select("id, email, display_name, created_at")
      .order("created_at", { ascending: true })
      .range(from, from + limit - 1);
    if (profiles.error) throw profiles.error;

    const ids = profiles.data.map((p) => p.id);
    const lastSeen = await lastSeenByUser(supabase, ids);

    const users = profiles.data.map((p) => ({
      id: p.id,
      email: p.email,
      name: p.display_name,
      plan: "free",
      granted: false,
      country: null,
      currency: null,
      created_at: p.created_at,
      last_seen_at: lastSeen.get(p.id) ?? null,
    }));

    return NextResponse.json({
      users,
      next_cursor: profiles.data.length === limit ? String(page + 1) : null,
    });
  } catch (err) {
    console.error("[api/dashboard/v1/users] failed", err);
    return NextResponse.json({ error: "Failed to list users" }, { status: 502 });
  }
}

/** Latest upload or answer per user: the learner's last real activity. */
async function lastSeenByUser(supabase: ReturnType<typeof createAdminClient>, ids: string[]) {
  const latest = new Map<string, string>();
  if (ids.length === 0) return latest;
  const [uploads, answers] = await Promise.all([
    supabase.from("sessions").select("user_id, created_at").in("user_id", ids),
    supabase.from("answers").select("user_id, created_at").in("user_id", ids),
  ]);
  if (uploads.error) throw uploads.error;
  if (answers.error) throw answers.error;
  for (const row of [...uploads.data, ...answers.data]) {
    const current = latest.get(row.user_id);
    if (!current || row.created_at > current) latest.set(row.user_id, row.created_at);
  }
  return latest;
}
