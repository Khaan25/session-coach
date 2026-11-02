/**
 * POST /api/sessions: step ① of a CLI upload. Body: the session's metadata (`uploadRequestSchema`), never the log.
 *   201 `{ id, upload_url }`: the row is `pending`; PUT the gzipped log to `upload_url` (valid 2 hours), then call
 *       POST /api/sessions/<id>/process.
 *       A repeat of a `failed` session, or of one stuck in `processing` for over 10 minutes, also gets 201: its cards
 *       are deleted, it goes back to `pending` and the new upload replaces the old log, so a push retries it.
 *   409 `{ id, upload_url }`: this session was started before but never processed; upload again and process.
 *   409 `{ id }`: this session is `ready`, or `processing` right now; nothing to do.
 *   400 bad body, 401 missing or unknown token, 413 `size_bytes` over 50 MB, 429 over 20 pushes an hour (`Retry-After`),
 *   500 anything else.
 * Auth: `Authorization: Bearer sc_…`, a CLI token from /setup. Never log the token.
 */
import { NextResponse } from "next/server";

import { userRateLimit } from "@/lib/auth/rate-limit";
import {
  bearerToken,
  MAX_UPLOAD_BYTES,
  rawPathFor,
  SESSIONS_BUCKET,
  uploadRequestSchema,
} from "@/lib/sessions/upload";
import { createAdminClient } from "@/lib/supabase/admin";
import { userForToken } from "@/lib/tokens/verify";

/** Postgres unique_violation: the same (user_id, external_id) was uploaded before. */
const UNIQUE_VIOLATION = "23505";

/**
 * A run lives at most 300 s (the process route's `after()` limit), so a session `processing` for longer than this was
 * killed and may be pushed again.
 */
const STUCK_MS = 10 * 60 * 1000;

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
 *   processing, so it gets a fresh URL to finish. `failed`, or `processing` past `STUCK_MS`, is reset to `pending`
 *   (cards deleted, `created_at` restarted) and answered like a new upload. `ready` or a live run is done: 409.
 *
 * @param request - JSON metadata, see `uploadRequestSchema`.
 */
export async function POST(request: Request) {
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) return NextResponse.json({ error: "Missing CLI token" }, { status: 401 });

  try {
    const userId = await userForToken(token);
    if (!userId) {
      return NextResponse.json(
        { error: "Unknown CLI token. Run session-coach login again." },
        { status: 401 },
      );
    }

    const limited = await userRateLimit("push", userId);
    if (limited) return limited;

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
      .single<{ id: string }>();

    if (insertError?.code === UNIQUE_VIOLATION) {
      const { data: existing, error: readError } = await admin
        .from("sessions")
        .select("id, status, created_at")
        .eq("user_id", userId)
        .eq("external_id", meta.external_id)
        .single<{ id: string; status: string; created_at: string }>();
      if (readError) throw new Error(readError.message);
      if (existing.status === "pending")
        return NextResponse.json({ id: existing.id, upload_url: await uploadUrl }, { status: 409 });
      const stuck =
        existing.status === "processing" && Date.now() - Date.parse(existing.created_at) > STUCK_MS;
      if (existing.status !== "failed" && !stuck)
        return NextResponse.json({ id: existing.id }, { status: 409 });

      // shortcut: `sessions` has no updated_at, so `created_at` stands in for "processing since": it restarts here, and
      // the process route sets it again when it claims the row. Add a processing_started_at column if anything else
      // ever needs the real upload time.
      // Compare-and-set on what was read, so of two pushes racing only one resets it and clears its cards.
      const { data: reset, error: resetError } = await admin
        .from("sessions")
        .update({ ...meta, status: "pending", error: null, created_at: new Date().toISOString() })
        .eq("id", existing.id)
        .eq("status", existing.status)
        .eq("created_at", existing.created_at)
        .select("id");
      if (resetError) throw new Error(resetError.message);
      if (reset.length === 0) return NextResponse.json({ id: existing.id }, { status: 409 });
      // After the claim, so a losing push never deletes cards. Done before answering, so the new run can't start first.
      // If this fails the session stays `pending` with old cards; the new run then fails on the cards' unique position
      // and the next push lands here again.
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
    console.error("[api/sessions] create failed", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "The session couldn't be registered. Try again." },
      { status: 500 },
    );
  }
}
