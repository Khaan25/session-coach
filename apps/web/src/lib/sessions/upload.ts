// Server-side helpers for POST /api/sessions; the request schema and limits are in @session-coach/shared (upload,
// limits). Pure, so node --test runs it.

/** The private bucket that holds redacted session logs (init migration). */
export const SESSIONS_BUCKET = "sessions";

/**
 * Where a session's log lives in the bucket. The user id comes first so one learner's files share a folder.
 *
 * @param userId - The owner, from the CLI token.
 * @param externalId - Claude Code's session_id, already validated by `uploadRequestSchema`.
 */
export function rawPathFor(userId: string, externalId: string): string {
  return `${userId}/${externalId}.jsonl.gz`;
}

const BEARER = /^Bearer\s+(\S+)$/i;

/**
 * The CLI token from an `Authorization: Bearer sc_…` header.
 *
 * @param header - The raw header value, or null when it was missing.
 * @returns The token, or null when the header is missing or isn't a bearer token.
 */
export function bearerToken(header: string | null): string | null {
  const match = header?.match(BEARER);
  return match ? match[1] : null;
}
