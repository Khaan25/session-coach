/**
 * Pure counting for the Play Stats API (docs/PLAY_API.md). No I/O, so it is tested directly.
 * Session Coach has no billing yet, so every account is in the `free` bucket.
 */

const DAY_MS = 86_400_000;

export type RetentionCohort = {
  date: string;
  signups: number;
  d1?: number;
  d7?: number;
  d30?: number;
};

/** UTC calendar day, `YYYY-MM-DD`. */
export function utcDay(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function countNewUsers(createdAt: readonly string[], now: Date, days: number): number {
  const since = now.getTime() - days * DAY_MS;
  return createdAt.filter((iso) => Date.parse(iso) >= since).length;
}

/**
 * For each signup day, how many of that day's accounts were active EXACTLY 1, 7 and 30 UTC days
 * later. A window the cohort hasn't lived through yet is omitted, never sent as 0.
 */
export function buildRetentionCohorts(
  profiles: readonly { id: string; created_at: string }[],
  activity: readonly { user_id: string; created_at: string }[],
  now: Date,
): RetentionCohort[] {
  const cohortOf = new Map(profiles.map((p) => [p.id, utcDay(p.created_at)]));
  const offsets = new Map<string, Set<number>>();
  for (const a of activity) {
    const cohort = cohortOf.get(a.user_id);
    if (!cohort) continue;
    const offset = (Date.parse(utcDay(a.created_at)) - Date.parse(cohort)) / DAY_MS;
    if (offset === 1 || offset === 7 || offset === 30) {
      const set = offsets.get(a.user_id) ?? new Set<number>();
      set.add(offset);
      offsets.set(a.user_id, set);
    }
  }

  const byDay = new Map<string, { signups: number; d1: number; d7: number; d30: number }>();
  for (const [userId, day] of cohortOf) {
    const row = byDay.get(day) ?? { signups: 0, d1: 0, d7: 0, d30: 0 };
    row.signups++;
    const seen = offsets.get(userId);
    if (seen?.has(1)) row.d1++;
    if (seen?.has(7)) row.d7++;
    if (seen?.has(30)) row.d30++;
    byDay.set(day, row);
  }

  const today = Date.parse(utcDay(now.toISOString()));
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, row]) => {
      const age = (today - Date.parse(date)) / DAY_MS;
      const cohort: RetentionCohort = { date, signups: row.signups };
      if (age >= 1) cohort.d1 = row.d1;
      if (age >= 7) cohort.d7 = row.d7;
      if (age >= 30) cohort.d30 = row.d30;
      return cohort;
    });
}
