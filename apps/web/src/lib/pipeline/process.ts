import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// Placeholder until Kasam's extraction lands; his PR replaces this file's body and keeps the signature.

/**
 * Turns one uploaded session into decision cards. POST /api/sessions/[id]/process calls it inside `after()`, once it
 * has moved the session from `pending` to `processing`, so this starts at `processing` and must end at `ready` or
 * `failed`, never leaving the session in `processing`.
 *
 * @param sessionId - The session to process; its log is at `raw_path` in the `sessions` bucket.
 */
export async function processSession(sessionId: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("sessions")
    .update({ status: "failed", error: "Cards can't be made yet: extraction isn't live." })
    .eq("id", sessionId);
  if (error) console.error("[pipeline/process] status not set", sessionId, error.message);
}
