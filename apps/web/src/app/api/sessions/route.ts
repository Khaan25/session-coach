/**
 * POST /api/sessions: step ① of a CLI upload. Body: the session's metadata (`uploadRequestSchema`), never the log.
 *   201 `{ id, upload_url }`: the row is `pending`; PUT the gzipped log to `upload_url` (valid 2 hours), then call
 *       POST /api/sessions/<id>/process.
 *   409 `{ id, upload_url }`: this session was started before but never processed; upload again and process.
 *   409 `{ id }`: this session was already processed; nothing to do.
 *   400 bad body, 401 missing or unknown token, 413 `size_bytes` over 50 MB, 500 anything else.
 * Auth: `Authorization: Bearer sc_…`, a CLI token from /setup. Never log the token.
 */
import { NextResponse } from "next/server";

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
 *   processing, so it gets a fresh URL to finish; any other status means it's done.
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
    const { data: created, error: insertError } = await admin
      .from("sessions")
      .insert({ ...meta, user_id: userId, raw_path: rawPath })
      .select("id")
      .single<{ id: string }>();

    if (insertError?.code === UNIQUE_VIOLATION) {
      const { data: existing, error: readError } = await admin
        .from("sessions")
        .select("id, status")
        .eq("user_id", userId)
        .eq("external_id", meta.external_id)
        .single<{ id: string; status: string }>();
      if (readError) throw new Error(readError.message);
      if (existing.status !== "pending")
        return NextResponse.json({ id: existing.id }, { status: 409 });
      const uploadUrl = await signedUploadUrl(admin, rawPath);
      return NextResponse.json({ id: existing.id, upload_url: uploadUrl }, { status: 409 });
    }
    if (insertError) throw new Error(insertError.message);

    const uploadUrl = await signedUploadUrl(admin, rawPath);
    return NextResponse.json({ id: created.id, upload_url: uploadUrl }, { status: 201 });
  } catch (err) {
    console.error("[api/sessions] create failed", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "The session couldn't be registered. Try again." },
      { status: 500 },
    );
  }
}
