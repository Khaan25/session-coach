/**
 * POST /api/sessions: step ① of a CLI upload. Body: the session's metadata (`uploadRequestSchema`), never the log.
 *   201 `{ id, upload_url }`: the row is `pending`; PUT the gzipped log to `upload_url` (valid 2 hours), then call
 *       POST /api/sessions/<id>/process.
 *       A repeat of a `failed` or stuck session also gets 201: its cards are deleted and it goes back to `pending`.
 *   409 `{ id, upload_url }`: this session was started before but never processed; upload again and process.
 *   409 `{ id }`: this session is `ready`, or `processing` right now; nothing to do.
 *   400 bad body, 401 missing or unknown token, 413 `size_bytes` over 50 MB, 429 over 20 pushes an hour (`Retry-After`),
 *   500 anything else.
 * Auth: `Authorization: Bearer sc_…`, a CLI token from /setup. Never log the token.
 */
import { MAX_UPLOAD_BYTES } from "@session-coach/shared/limits";
import { uploadRequestSchema } from "@session-coach/shared/upload";
import { NextResponse } from "next/server";

import { requireCliUser, serverError, UNIQUE_VIOLATION } from "@/lib/api/http";
import { tooManyRequests, userRateLimit } from "@/lib/auth/rate-limit";
import { isStuck } from "@/lib/sessions/stuck";
import { rawPathFor, SESSIONS_BUCKET } from "@/lib/sessions/upload";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * A signed URL the CLI PUTs the log to, straight into Storage. `upsert` lets a retry overwrite a half-finished upload.
 *
 * @param admin - The service-role client.
 * @param path - The log's path in the bucket.
 */
async function signedUploadUrl(admin: ReturnType<typeof createAdminClient>, path: string) {
  const { data, error } = await admin.storage
    .from(SESSIONS_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });
  if (error) throw new Error(`createSignedUploadUrl: ${error.message}`);
  return data.signedUrl;
}

/**
 * Registers a session and hands back where to upload its log.
 *
 * - Checks the token before reading the body, so an anonymous caller learns nothing about the contract.
 * - Refuses an oversized log by its declared size before any row exists.
 * - A repeat upload hits the `(user_id, external_id)` unique key: still `pending` means the earlier try died before
 *   processing, so it gets a fresh URL to finish. `failed` or stuck (`isStuck`) is reset to `pending` with its cards
 *   deleted, and answered like a new upload. `ready` or a live run is done: 409.
 *
 * @param request - JSON metadata, see `uploadRequestSchema`.
 */
export async function POST(request: Request) {
  try {
    const userId = await requireCliUser(request);
    if (userId instanceof NextResponse) return userId;

    const body: unknown = await request.json().catch(() => null);
    const parsed = uploadRequestSchema.safeParse(body);
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path.join(".") || "body";
      return NextResponse.json({ error: `Invalid ${field}`, field }, { status: 400 });
    }
    const { size_bytes, ...meta } = parsed.data;
    if (size_bytes > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "This session's log is over 50 MB, too big to upload.", field: "size_bytes" },
        { status: 413 },
      );
    }
    // After validation, so a malformed request doesn't spend the learner's budget.
    const limited = await userRateLimit("push", userId);
    if (limited) return tooManyRequests(limited);

    const admin = createAdminClient();
    const rawPath = rawPathFor(userId, meta.external_id);
    // The URL depends only on the path, so it is signed while the row is written. A processed repeat never awaits it,
    // so a signing failure can't turn its 409 into a 500; the empty catch only marks that rejection handled.
    const uploadUrl = signedUploadUrl(admin, rawPath);
    uploadUrl.catch(() => {});
    const { data: created, error: insertError } = await admin
      .from("sessions")
      .insert({ ...meta, user_id: userId, raw_path: rawPath })
      .select("id")
      .single();

    if (insertError?.code === UNIQUE_VIOLATION) {
      const { data: existing, error: readError } = await admin
        .from("sessions")
        .select("id, status, processing_started_at, created_at")
        .eq("user_id", userId)
        .eq("external_id", meta.external_id)
        .single();
      if (readError) throw new Error(readError.message);
      if (existing.status === "pending") {
        // Restarts the stuck clock for this upload attempt (see isStuck), so the sweep can't fail it mid-upload.
        const { error: touchError } = await admin
          .from("sessions")
          .update({ processing_started_at: new Date().toISOString() })
          .eq("id", existing.id)
          .eq("status", "pending");
        if (touchError) throw new Error(touchError.message);
        return NextResponse.json({ id: existing.id, upload_url: await uploadUrl }, { status: 409 });
      }
      if (existing.status !== "failed" && !isStuck(existing, new Date()))
        return NextResponse.json({ id: existing.id }, { status: 409 });

      // Compare-and-set on the status and run read, so of two racing pushes only one resets it and clears its cards,
      // and a push that read an older run can't reset a newer one.
      const reset = admin
        .from("sessions")
        // On a pending row, processing_started_at is when this upload attempt began (see isStuck).
        .update({
          ...meta,
          status: "pending",
          error: null,
          processing_started_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .eq("status", existing.status);
      const { data: resetRows, error: resetError } = await (
        existing.processing_started_at
          ? reset.eq("processing_started_at", existing.processing_started_at)
          : reset.is("processing_started_at", null)
      ).select("id");
      if (resetError) throw new Error(resetError.message);
      if (resetRows.length === 0) return NextResponse.json({ id: existing.id }, { status: 409 });
      // After the claim, so a losing push never deletes cards; before answering, so the new run can't start first.
      const { error: cardsError } = await admin
        .from("decision_cards")
        .delete()
        .eq("session_id", existing.id);
      if (cardsError) throw new Error(cardsError.message);
      return NextResponse.json({ id: existing.id, upload_url: await uploadUrl }, { status: 201 });
    }
    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ id: created.id, upload_url: await uploadUrl }, { status: 201 });
  } catch (err) {
    return serverError(
      "[api/sessions] create",
      err,
      "The session couldn't be registered. Try again.",
    );
  }
}
