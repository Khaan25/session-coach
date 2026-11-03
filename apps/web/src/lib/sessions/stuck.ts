import type { SupabaseClient } from "@supabase/supabase-js";

// A run lives at most 300 s (the process route's maxDuration), so `processing` past this means it was killed.
export const STUCK_MS = 10 * 60 * 1000;

const STUCK_ERROR =
  "Making cards from this session didn't finish. Run session-coach push again to retry.";

/**
 * Whether a session's run was killed: still `processing` more than `STUCK_MS` after the run claimed it.
 *
 * @param session - `status` and `processing_started_at` from `sessions`.
 * @param now - The current time.
 */
export function isStuck(
  { status, processing_started_at }: { status: string; processing_started_at: string | null },
  now: Date,
): boolean {
  if (status !== "processing" || !processing_started_at) return false;
  return now.getTime() - Date.parse(processing_started_at) > STUCK_MS;
}

/**
 * Marks every stuck session `failed`, so a killed run doesn't spin on the dashboard forever.
 *
 * @param admin - The service-role client.
 * @param now - The current time.
 * @returns How many sessions were failed.
 */
export async function failStuckSessions(admin: SupabaseClient, now: Date): Promise<number> {
  const { data, error } = await admin
    .from("sessions")
    .update({ status: "failed", error: STUCK_ERROR })
    .eq("status", "processing")
    .lt("processing_started_at", new Date(now.getTime() - STUCK_MS).toISOString())
    .select("id");
  if (error) throw new Error(error.message);
  return data.length;
}
