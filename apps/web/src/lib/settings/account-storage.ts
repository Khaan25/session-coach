/** The private bucket that holds redacted session logs (supabase/migrations/20261028000000_init.sql). */
export const SESSIONS_BUCKET = "sessions";

/**
 * The Storage objects to delete with an account: each session's `raw_path`, plus every file listed under the
 * `<user_id>/` prefix (the layout the fixtures use: `<user_id>/<session_id>.jsonl.gz`), which catches uploads whose
 * session row was never written.
 * shortcut: the prefix listing is one level deep; if uploads ever nest folders under `<user_id>/`, list recursively.
 *
 * @param userId - The learner being deleted.
 * @param rawPaths - `sessions.raw_path` of every session the learner owns.
 * @param listed - The entries Storage lists under `<user_id>/`; folders have a null id and are skipped.
 * @returns Unique object paths.
 */
export function accountStoragePaths(
  userId: string,
  rawPaths: string[],
  listed: { name: string; id: string | null }[],
): string[] {
  const prefixed = listed.filter((entry) => entry.id !== null).map((e) => `${userId}/${e.name}`);
  // The service role deletes these, so a raw_path outside the learner's own folder is never trusted.
  const own = rawPaths.filter((path) => path.startsWith(`${userId}/`));
  return [...new Set([...own, ...prefixed])];
}
