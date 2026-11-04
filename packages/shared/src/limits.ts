// Limits the CLI and the web app must agree on. No zod here: the CLI bundles this file, and only takes types from
// upload.ts.

/** Storage's per-file limit (supabase/config.toml `file_size_limit`), checked against the size the CLI declares. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** What slow_down adds to the device-code poll interval (RFC 8628 section 3.5), and the `poll_interval` column's ceiling. */
export const SLOW_DOWN_STEP_SECONDS = 5;
export const MAX_POLL_INTERVAL_SECONDS = 60;
