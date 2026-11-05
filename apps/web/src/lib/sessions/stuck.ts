import type { SupabaseClient } from "@supabase/supabase-js";

// A run lives at most 300 s (the process route's maxDuration), so `processing` past this means it was killed. An upload
// takes at most about 2.5 min (two API calls around a 120 s PUT), so `pending` past this means the CLI gave up.
export const STUCK_MS = 10 * 60 * 1000;

const STUCK_ERROR = "Making cards from this session didn't finish. Try again.";
const UPLOAD_ERROR = "The upload didn't finish. Try again.";

/**
 * Whether a session will never settle by itself: still `processing` more than `STUCK_MS` after the run claimed it
 * (the run was killed), or still `pending` more than `STUCK_MS` after it was registered (the upload died).
 *
 * @param session - `status`, `processing_started_at` and `created_at` from `sessions`.
 * @param now - The current time.
 */
export function isStuck(
  {
    status,
    processing_started_at,
    created_at,
  }: { status: string; processing_started_at: string | null; created_at: string },
  now: Date,
): boolean {
  const since =
    status === "processing" ? processing_started_at : status === "pending" ? created_at : null;
  return since !== null && now.getTime() - Date.parse(since) > STUCK_MS;
}

/**
 * Marks every stuck session `failed` (see `isStuck`), so a killed run or a dead upload doesn't spin on the dashboard
 * forever. The learner can then retry it from the session page.
 *
 * @param admin - The service-role client.
 * @param now - The current time.
 * @returns How many sessions were failed.
 */
export async function failStuckSessions(admin: SupabaseClient, now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - STUCK_MS).toISOString();
  const [runs, uploads] = await Promise.all([
    admin
      .from("sessions")
      .update({ status: "failed", error: STUCK_ERROR })
      .eq("status", "processing")
      .lt("processing_started_at", cutoff)
      .select("id"),
    admin
      .from("sessions")
      .update({ status: "failed", error: UPLOAD_ERROR })
      .eq("status", "pending")
      .lt("created_at", cutoff)
      .select("id"),
  ]);
  if (runs.error) throw new Error(runs.error.message);
  if (uploads.error) throw new Error(uploads.error.message);
  return runs.data.length + uploads.data.length;
}
