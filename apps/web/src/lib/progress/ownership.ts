import { countOwned } from "../review/level.ts";
import type { ReviewState } from "../review/schedule.ts";

// Pure ownership meter maths for the dashboard, so node --test runs it. Definitions from the tracker task and DECISIONS
// (2026-11-04 review ladder): owned = `reviews.mastered`, explained = answered 2 at least once, total = visible cards,
// grouped by `sessions.repo`. No card is mastered before about 14 Nov, so "explained" carries the meter until then.

/** The learner's rows, read by `getOwnership()`. */
export type OwnershipInput = {
  /** The learner's visible cards (RLS drops hidden ones). Reviews and answers of other cards are ignored. */
  cards: { id: string; session_id: string }[];
  /** The learner's sessions, for each card's repo. */
  sessions: { id: string; repo: string | null }[];
  /** `reviews` rows. */
  reviews: ({ card_id: string } & Pick<ReviewState, "step" | "mastered">)[];
  /** Card ids of `answers` scored 2; a card may repeat. */
  explainedIds: string[];
};

/** Explained, owned and visible cards in one repo, or in all of them. */
export type OwnershipCount = { explained: number; owned: number; total: number };

/** The meter: the overall line, then one row per repo (null: sessions sent without one), A to Z, null last. */
export type Ownership = {
  overall: OwnershipCount;
  repos: (OwnershipCount & { repo: string | null })[];
};

/**
 * Counts explained, owned and visible cards, overall and per repo. Repos with no visible card are left out.
 *
 * @param input - The learner's visible cards, sessions, reviews and the card ids answered 2.
 * @returns See `Ownership`.
 */
export function computeOwnership({
  cards,
  sessions,
  reviews,
  explainedIds,
}: OwnershipInput): Ownership {
  const repoOf = new Map(sessions.map(({ id, repo }) => [id, repo]));
  const reviewOf = new Map(reviews.map((r) => [r.card_id, r]));
  const explained = new Set(explainedIds);

  const count = (own: OwnershipInput["cards"]): OwnershipCount => ({
    explained: own.filter(({ id }) => explained.has(id)).length,
    ...countOwned(own.map(({ id }) => reviewOf.get(id))),
  });

  const byRepo = new Map<string | null, OwnershipInput["cards"]>();
  for (const card of cards) {
    const repo = repoOf.get(card.session_id) ?? null;
    byRepo.set(repo, [...(byRepo.get(repo) ?? []), card]);
  }
  const repos = [...byRepo]
    .map(([repo, own]) => ({ repo, ...count(own) }))
    .sort((a, b) =>
      a.repo === null ? 1 : b.repo === null ? -1 : a.repo.localeCompare(b.repo, "en"),
    );

  return { overall: count(cards), repos };
}
