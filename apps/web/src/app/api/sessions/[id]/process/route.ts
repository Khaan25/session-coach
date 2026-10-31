/**
 * POST /api/sessions/<id>/process: step ③ of a CLI upload, after the log was PUT to the signed URL.
 *   202 `{ id }`: the session moved to `processing`; cards follow, and the dashboard updates through Realtime.
 *   409 `{ id, status }`: already processing, ready or failed; nothing to do.
 *   422: the log isn't in Storage yet; start again at POST /api/sessions.
 *   400 bad id, 401 missing or unknown token, 404 not this learner's session, 413 log over 50 MB, 500 anything else.
 * Auth: `Authorization: Bearer sc_…`.
 */
import { after, NextResponse } from "next/server";
import { z } from "zod";

import { processSession } from "@/lib/pipeline/process";
import { bearerToken, MAX_UPLOAD_BYTES, SESSIONS_BUCKET } from "@/lib/sessions/upload";
import { createAdminClient } from "@/lib/supabase/admin";
import { userForToken } from "@/lib/tokens/verify";

const idSchema = z.uuid();

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
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) return NextResponse.json({ error: "Missing CLI token" }, { status: 401 });

  const id = idSchema.safeParse((await context.params).id);
  if (!id.success) {
    return NextResponse.json({ error: "id must be a session id", field: "id" }, { status: 400 });
  }

  try {
    const userId = await userForToken(token);
    if (!userId) {
      return NextResponse.json(
        { error: "Unknown CLI token. Run session-coach login again." },
        { status: 401 },
      );
    }

    const admin = createAdminClient();
    const { data: session, error: readError } = await admin
      .from("sessions")
      .select("id, user_id, status, raw_path")
      .eq("id", id.data)
      .maybeSingle<{ id: string; user_id: string; status: string; raw_path: string }>();
    if (readError) throw new Error(readError.message);
    if (!session || session.user_id !== userId) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.status !== "pending") {
      return NextResponse.json({ id: session.id, status: session.status }, { status: 409 });
    }

    const { data: file } = await admin.storage.from(SESSIONS_BUCKET).info(session.raw_path);
    if (!file) {
      return NextResponse.json(
        { error: "The log isn't uploaded yet. Start the upload again." },
        { status: 422 },
      );
    }
    if ((file.size ?? 0) > MAX_UPLOAD_BYTES) {
      await admin
        .from("sessions")
        .update({ status: "failed", error: "This session's log is over 50 MB, too big to read." })
        .eq("id", session.id);
      return NextResponse.json({ error: "The log is over 50 MB." }, { status: 413 });
    }

    const { data: claimed, error: claimError } = await admin
      .from("sessions")
      .update({ status: "processing", error: null })
      .eq("id", session.id)
      .eq("status", "pending")
      .select("id");
    if (claimError) throw new Error(claimError.message);
    if (claimed.length === 0) {
      return NextResponse.json({ id: session.id, status: "processing" }, { status: 409 });
    }

    after(() => processSession(session.id));
    return NextResponse.json({ id: session.id }, { status: 202 });
  } catch (err) {
    console.error("[api/sessions/process] failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Processing couldn't start. Try again." }, { status: 500 });
  }
}
