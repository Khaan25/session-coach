// The dashboard's ownership meter, shaped for the page; pure, so node --test runs it. The counting is
// `learner_ownership()` in SQL. Definitions from the tracker task and DECISIONS (2026-11-04 review ladder): owned =
// `reviews.mastered`, explained = answered 2 at least once, total = visible cards, grouped by `sessions.repo`. No card is
// mastered before about 14 Nov, so "explained" carries the meter until then.

import type { Database, Tables } from "../supabase/database.types.ts";

type Generated = Database["public"]["Functions"]["learner_ownership"]["Returns"][number];

/**
 * One row of `learner_ownership()`, from the generated types. The generator can't tell that a function's column can be
 * null, so `repo` takes its type from `sessions.repo`, where the null comes from (sessions sent without a repo).
 */
export type OwnershipRow = Omit<Generated, "repo"> & { repo: Tables<"sessions">["repo"] };

/** Explained, owned and visible cards in one repo, or in all of them. */
export type OwnershipCount = Omit<OwnershipRow, "repo">;

/** The meter: the overall line, then one row per repo, A to Z, null last. */
export type Ownership = { overall: OwnershipCount; repos: OwnershipRow[] };

/**
 * Sums the per-repo counts into the overall line and orders the repos. Postgres only returns repos with a visible card.
 *
 * @param rows - `learner_ownership()`'s rows, in any order.
 * @returns See `Ownership`.
 */
export function computeOwnership(rows: readonly OwnershipRow[]): Ownership {
  const overall = { explained: 0, owned: 0, total: 0 };
  for (const row of rows) {
    overall.explained += row.explained;
    overall.owned += row.owned;
    overall.total += row.total;
  }
  const repos = rows
    .map(({ repo, explained, owned, total }) => ({ repo, explained, owned, total }))
    .sort((a, b) =>
      a.repo === null ? 1 : b.repo === null ? -1 : a.repo.localeCompare(b.repo, "en"),
    );
  return { overall, repos };
}
