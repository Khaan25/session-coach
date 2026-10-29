import type { Session } from "@session-coach/shared/session";

// Pure helpers shared by the server queries and the Realtime hook. No imports with side effects, so node --test runs it.

/** The columns the session list selects, by name (plan, Phase 4 step 1). */
export const SESSION_COLUMNS =
  "id, title, repo, branch, started_at, duration_min, status, error, created_at";

/** Sessions per dashboard page (plan, Phase 4 step 1). */
export const PAGE_SIZE = 20;

/** One session as the lists show it: the `SESSION_COLUMNS`, nothing the learner doesn't see. */
export type SessionSummary = Pick<
  Session,
  | "id"
  | "title"
  | "repo"
  | "branch"
  | "started_at"
  | "duration_min"
  | "status"
  | "error"
  | "created_at"
>;

/** A row in the session list: the summary plus its visible card count once it is ready. */
export type SessionListItem = SessionSummary & { cardCount?: number };

/** `?page=` as a whole number from 1; anything else is page 1. */
export function parsePage(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** Today's date (YYYY-MM-DD) in an IANA time zone. An unknown zone falls back to UTC. */
export function localDate(timeZone: string, now: Date): string {
  try {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/**
 * Keeps only the summary columns of a Realtime record, which carries the whole row, so a Realtime update has the same
 * shape as a server-rendered row and `raw_path` and friends never land in client state.
 *
 * @param record - `payload.new` from a `postgres_changes` event.
 */
export function toSummary(record: Record<string, unknown>): SessionSummary {
  const r = record as SessionSummary;
  return {
    id: r.id,
    title: r.title ?? null,
    repo: r.repo ?? null,
    branch: r.branch ?? null,
    started_at: r.started_at ?? null,
    duration_min: r.duration_min ?? null,
    status: r.status,
    error: r.error ?? null,
    created_at: r.created_at,
  };
}

/**
 * Applies an inserted or updated row: an existing row is updated in place (keeping its card count), a new one is
 * prepended when `prepend` is set (page 1, the sidebar) and it is no older than the newest row, and the list is cut
 * to `limit`. An update to an older session outside the list stays out of it.
 * Older pages pass `prepend: false`, so a new upload doesn't push rows off a page the learner is reading.
 *
 * @param rows - The list as rendered now.
 * @param row - The inserted or updated session.
 * @param options.prepend - Whether a new session joins this list.
 * @param options.limit - The most rows the list may hold.
 * @returns A new array; `rows` is not changed.
 */
export function applySessionChange(
  rows: SessionListItem[],
  row: SessionSummary,
  { prepend, limit }: { prepend: boolean; limit: number },
): SessionListItem[] {
  const i = rows.findIndex(({ id }) => id === row.id);
  if (i >= 0) return rows.map((old, j) => (j === i ? { ...old, ...row } : old));
  const newest = rows[0] ? Date.parse(rows[0].created_at) : -Infinity;
  return prepend && Date.parse(row.created_at) >= newest ? [row, ...rows].slice(0, limit) : rows;
}
