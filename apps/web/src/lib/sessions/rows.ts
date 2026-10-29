import type { Session } from "@session-coach/shared/session";

// Pure helpers shared by the server queries and the Realtime hook. No imports with side effects, so node --test runs it.

/** The columns the session list selects, by name (plan, Phase 4 step 1). */
export const SESSION_COLUMNS =
  "id, title, repo, branch, started_at, duration_min, status, error, created_at";

export const PAGE_SIZE = 20;

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

/** Keeps only the summary columns of a Realtime record, which carries the whole row. */
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
 * prepended when `prepend` is set (page 1, the sidebar) and the list is cut to `limit`.
 */
export function applySessionChange(
  rows: SessionListItem[],
  row: SessionSummary,
  { prepend, limit }: { prepend: boolean; limit: number },
): SessionListItem[] {
  const i = rows.findIndex(({ id }) => id === row.id);
  if (i >= 0) return rows.map((old, j) => (j === i ? { ...old, ...row } : old));
  return prepend ? [row, ...rows].slice(0, limit) : rows;
}
