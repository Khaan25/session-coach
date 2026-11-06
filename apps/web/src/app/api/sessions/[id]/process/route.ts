/**
 * POST /api/sessions/<id>/process: step ③ of a CLI upload, after the log was PUT to the signed URL.
 *   202 `{ id }`: the session moved to `processing`; cards follow, and the dashboard updates through Realtime.
 *   409 `{ id, status }`: already processing, ready or failed; nothing to do.
 *   422: the log isn't in Storage yet; start again at POST /api/sessions.
 *   401 missing or unknown token (checked first), 400 bad id, 404 not this learner's session, 413 log over 50 MB,
 *   429 over 20 runs an hour (`Retry-After` header, in seconds), 500 anything else, including a Storage failure.
 * Auth: `Authorization: Bearer sc_…`.
 */
import { MAX_UPLOAD_BYTES } from "@session-coach/shared/limits";
import { after, NextResponse } from "next/server";
import { z } from "zod";

import { requireCliUser, serverError } from "@/lib/api/http";
import { tooManyRequests, userRateLimit } from "@/lib/auth/rate-limit";
import { processSession } from "@/lib/pipeline/process";
import { isMissingObject } from "@/lib/sessions/missing-object";
import { SESSIONS_BUCKET } from "@/lib/sessions/upload";
import { createAdminClient } from "@/lib/supabase/admin";

const idSchema = z.uuid();

/** Seconds for this route and its `after()` work; `processSession` gives up at 280 s to still mark failure. */
export const maxDuration = 300;

/**
 * Starts extraction for one uploaded session.
 *
 * - Another learner's session answers 404, the same as a missing one, so ids can't be probed.
 * - Checks the log is really in Storage, and its real size: the size the CLI declared in step ① isn't trusted.
 * - Claims the session with a compare-and-set from `pending` to `processing`, so two calls can't both start it.
 * - Runs `processSession` in `after()`: the CLI gets 202 at once, and the work still counts inside the 300 s limit.
 *
 * @param request - Carries the bearer token.
 * @param context - The `[id]` route param.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const invokedAt = Date.now();
  try {
    const userId = await requireCliUser(request);
    if (userId instanceof NextResponse) return userId;

    const id = idSchema.safeParse((await context.params).id);
    if (!id.success) {
      return NextResponse.json({ error: "id must be a session id", field: "id" }, { status: 400 });
    }
    const admin = createAdminClient();
    const { data: session, error: readError } = await admin
      .from("sessions")
      .select("user_id, status, raw_path")
      .eq("id", id.data)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!session || session.user_id !== userId) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.status !== "pending") {
      return NextResponse.json({ id: id.data, status: session.status }, { status: 409 });
    }

    const { data: file, error: infoError } = await admin.storage
      .from(SESSIONS_BUCKET)
      .info(session.raw_path);
    // Only a missing object is "not uploaded yet"; Storage failing is a 500, so the CLI doesn't re-upload for nothing.
    if (infoError && !isMissingObject(infoError)) throw new Error(infoError.message);
    if (!file) {
      return NextResponse.json(
        { error: "The log isn't uploaded yet. Start the upload again." },
        { status: 422 },
      );
    }
    if ((file.size ?? 0) > MAX_UPLOAD_BYTES) {
      const { error: failError } = await admin
        .from("sessions")
        .update({ status: "failed", error: "This session's log is over 50 MB, too big to read." })
        .eq("id", id.data);
      if (failError) throw new Error(failError.message);
      return NextResponse.json({ error: "The log is over 50 MB." }, { status: 413 });
    }

    // Only a run that can really start spends the learner's budget.
    const limited = await userRateLimit("process", userId);
    if (limited) return tooManyRequests(limited);

    const startedAt = new Date().toISOString();
    const { data: claimed, error: claimError } = await admin
      .from("sessions")
      .update({
        status: "processing",
        error: null,
        processing_started_at: startedAt,
      })
      .eq("id", id.data)
      .eq("status", "pending")
      .select("id");
    if (claimError) throw new Error(claimError.message);
    if (claimed.length === 0) {
      return NextResponse.json({ id: id.data, status: "processing" }, { status: 409 });
    }

    after(() => processSession(id.data, startedAt, invokedAt));
    return NextResponse.json({ id: id.data }, { status: 202 });
  } catch (err) {
    return serverError("[api/sessions/process]", err, "Processing couldn't start. Try again.");
  }
}
