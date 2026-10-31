import { z } from "zod";

// The upload contract between the CLI and POST /api/sessions. Pure, so node --test runs it.

/** Storage's per-file limit (supabase/config.toml `file_size_limit`), checked against the size the CLI declares. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** The private bucket that holds redacted session logs (init migration). */
export const SESSIONS_BUCKET = "sessions";

/**
 * Metadata for one session. The log itself goes straight to Storage through the signed URL this returns, so a big
 * log never passes through a Vercel function (4.5 MB body limit).
 */
export const uploadRequestSchema = z.object({
  /** Claude Code's session_id. It becomes part of a Storage path, so only safe characters. */
  external_id: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
  agent: z.enum(["claude-code", "codex"]).default("claude-code"),
  title: z.string().trim().max(200).nullish(),
  repo: z.string().trim().max(200).nullish(),
  branch: z.string().trim().max(200).nullish(),
  started_at: z.iso.datetime({ offset: true }).nullish(),
  duration_min: z.number().int().min(0).nullish(),
  event_count: z.number().int().min(0).nullish(),
  /** Size of the .jsonl.gz the CLI will upload. Over the limit answers 413 before a row is made. */
  size_bytes: z.number().int().positive(),
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;

/**
 * Where a session's log lives in the bucket. The user id comes first so one learner's files share a folder.
 *
 * @param userId - The owner, from the CLI token.
 * @param externalId - Claude Code's session_id, already validated by `uploadRequestSchema`.
 */
export function rawPathFor(userId: string, externalId: string): string {
  return `${userId}/${externalId}.jsonl.gz`;
}

/**
 * The CLI token from an `Authorization: Bearer sc_…` header.
 *
 * @param header - The raw header value, or null when it was missing.
 * @returns The token, or null when the header is missing or isn't a bearer token.
 */
export function bearerToken(header: string | null): string | null {
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}
