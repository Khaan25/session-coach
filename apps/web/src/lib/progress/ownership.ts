// The dashboard's ownership meter, shaped for the page; pure, so node --test runs it. The counting is
// `learner_ownership()` in SQL. Definitions from the tracker task and DECISIONS (2026-11-04 review ladder): owned =
// `reviews.mastered`, explained = answered 2 at least once, total = visible cards, grouped by `sessions.repo`. No card is
// mastered before about 14 Nov, so "explained" carries the meter until then.

/** One row of `learner_ownership()`: a repo's counts, counted in Postgres. */
export type OwnershipRow = { repo: string | null; explained: number; owned: number; total: number };

/** Explained, owned and visible cards in one repo, or in all of them. */
export type OwnershipCount = { explained: number; owned: number; total: number };

/** The meter: the overall line, then one row per repo (null: sessions sent without one), A to Z, null last. */
export type Ownership = {
  overall: OwnershipCount;
  repos: (OwnershipCount & { repo: string | null })[];
};

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
