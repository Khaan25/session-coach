/**
 * POST /api/sessions/<id>/retry: the session page's "Try again" for a session that failed or is stuck (`isStuck`).
 * The log is still in Storage, so the run starts again from it without the CLI.
 *   202 `{ id }`: the session moved to `processing` with its old cards deleted; the page updates through Realtime.
 *   409 `{ id, status }`: ready, or a live run or upload; nothing to do.
 *   422: the log never reached Storage; only a new upload from the CLI can fix it.
 *   401 signed out, 400 bad id, 404 not this learner's session, 413 log over 50 MB, 429 over 20 runs an hour
 *   (`Retry-After`), 500 anything else.
 * Auth: the learner's session cookie.
 */
import { MAX_UPLOAD_BYTES } from "@session-coach/shared/limits";
import { after, NextResponse } from "next/server";
import { z } from "zod";

import { requireUser, serverError } from "@/lib/api/http";
import { tooManyRequests, userRateLimit } from "@/lib/auth/rate-limit";
import { processSession } from "@/lib/pipeline/process";
import { isMissingObject } from "@/lib/sessions/missing-object";
import { isStuck } from "@/lib/sessions/stuck";
import { SESSIONS_BUCKET } from "@/lib/sessions/upload";
import { createAdminClient } from "@/lib/supabase/admin";

const idSchema = z.uuid();

/** Seconds for this route and its `after()` work, the same budget as the process route. */
export const maxDuration = 300;

/**
 * Runs extraction again for one of the learner's sessions.
 *
 * - `getUser()` first, since this writes. Another learner's session answers 404, the same as a missing one.
 * - Only `failed` or stuck sessions; a ready session or a live run is 409, so a click can't wipe good cards.
 * - Checks the log is in Storage and its real size before spending the learner's run budget.
 * - Claims with a compare-and-set on the status and run it read, like a re-push, so two clicks (or a click racing a
 *   re-push) start one run. Deletes the old cards after the claim and before the run starts.
 *
 * @param _request - Unused; the cookie carries the learner.
 * @param context - The `[id]` route param.
 */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const invokedAt = Date.now();
  try {
    const signedIn = await requireUser();
    if (signedIn instanceof NextResponse) return signedIn;
    const userId = signedIn.user.id;

    const id = idSchema.safeParse((await context.params).id);
    if (!id.success) {
      return NextResponse.json({ error: "id must be a session id", field: "id" }, { status: 400 });
    }
    const admin = createAdminClient();
    const { data: session, error: readError } = await admin
      .from("sessions")
      .select("user_id, status, raw_path, processing_started_at, created_at")
      .eq("id", id.data)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!session || session.user_id !== userId) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.status !== "failed" && !isStuck(session, new Date())) {
      return NextResponse.json({ id: id.data, status: session.status }, { status: 409 });
    }

    const { data: file, error: infoError } = await admin.storage
      .from(SESSIONS_BUCKET)
      .info(session.raw_path);
    if (infoError && !isMissingObject(infoError)) throw new Error(infoError.message);
    if (!file) {
      return NextResponse.json(
        {
          error:
            "This session's log never reached Session Coach. Run npx session-coach push on the computer that recorded it.",
        },
        { status: 422 },
      );
    }
    if ((file.size ?? 0) > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "This session's log is over 50 MB, too big to read." },
        { status: 413 },
      );
    }

    const limited = await userRateLimit("process", userId);
    if (limited) return tooManyRequests(limited);

    const startedAt = new Date().toISOString();
    const claim = admin
      .from("sessions")
      .update({ status: "processing", error: null, processing_started_at: startedAt })
      .eq("id", id.data)
      .eq("status", session.status);
    const { data: claimed, error: claimError } = await (
      session.processing_started_at
        ? claim.eq("processing_started_at", session.processing_started_at)
        : claim.is("processing_started_at", null)
    ).select("id");
    if (claimError) throw new Error(claimError.message);
    if (claimed.length === 0) {
      return NextResponse.json({ id: id.data, status: "processing" }, { status: 409 });
    }
    const { error: cardsError } = await admin
      .from("decision_cards")
      .delete()
      .eq("session_id", id.data);
    if (cardsError) throw new Error(cardsError.message);

    after(() => processSession(id.data, startedAt, invokedAt));
    return NextResponse.json({ id: id.data }, { status: 202 });
  } catch (err) {
    return serverError("[api/sessions/retry]", err, "The session couldn't be retried. Try again.");
  }
}
