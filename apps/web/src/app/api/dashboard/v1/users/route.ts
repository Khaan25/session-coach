/**
 * GET /api/dashboard/v1/users: the user roster, paginated with `?limit=` and `?cursor=`.
 * Contract and filters: docs/PLAY_API.md. Auth: requireDashboardKey().
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireDashboardKey } from "@/lib/dashboard-api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/supabase/fetch-all";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
/** Every plan the dashboard may filter by; only `free` has users today. */
const PLANS = ["free", "premium", "trial", "granted", "promo", "sandbox"];
// No billing and no checkout yet: `purchase` truthfully lists nobody; `checkout` isn't tracked.
const STAGES = ["purchase"];

export async function GET(req: NextRequest) {
  const denied = requireDashboardKey(req);
  if (denied) return denied;

  const params = req.nextUrl.searchParams;
  const limit = parsePositiveInt(params.get("limit"), DEFAULT_LIMIT);
  const page = parsePositiveInt(params.get("cursor"), 1);
  if (limit === null || limit > MAX_LIMIT) {
    return NextResponse.json(
      { error: `limit must be an integer from 1 to ${MAX_LIMIT}` },
      { status: 400 },
    );
  }
  if (page === null) {
    return NextResponse.json({ error: "cursor must be a positive integer" }, { status: 400 });
  }
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
      .order("id", { ascending: true })
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

/**
 * Latest upload or answer per user: the learner's last real activity.
 *
 * @param supabase - Service-role client.
 * @param ids - The users on the current roster page.
 * @returns Map of user id to their latest activity timestamp; users with none are absent.
 */
async function lastSeenByUser(supabase: ReturnType<typeof createAdminClient>, ids: string[]) {
  const latest = new Map<string, string>();
  if (ids.length === 0) return latest;
  // shortcut: reads every activity row for the page's users; move to a max(created_at) view when it gets slow.
  const [uploads, answers] = await Promise.all([
    fetchAll<{ user_id: string; created_at: string }>((from, to) =>
      supabase
        .from("sessions")
        .select("user_id, created_at")
        .in("user_id", ids)
        .order("id")
        .range(from, to),
    ),
    fetchAll<{ user_id: string; created_at: string }>((from, to) =>
      supabase
        .from("answers")
        .select("user_id, created_at")
        .in("user_id", ids)
        .order("id")
        .range(from, to),
    ),
  ]);
  for (const row of [...uploads, ...answers]) {
    const current = latest.get(row.user_id);
    // PostgREST may format timestamptz with an offset, so compare parsed times, not strings.
    if (!current || Date.parse(row.created_at) > Date.parse(current))
      latest.set(row.user_id, row.created_at);
  }
  return latest;
}

/** A query value as a positive integer: the fallback when absent, null when malformed. */
function parsePositiveInt(value: string | null, fallback: number): number | null {
  if (value === null || value === "") return fallback;
  if (!/^[1-9]\d*$/.test(value)) return null;
  return Number(value);
}
