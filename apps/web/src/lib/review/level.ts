// A card's level: the rung it sits on in the review schedule. Pure, so node --test runs it.

import type { ReviewState } from "./schedule.ts";

/** 0 never answered, 1-3 the pending step, "owned" once mastered. */
export type Level = 0 | 1 | 2 | 3 | "owned";

type ReviewRow = Pick<ReviewState, "step" | "mastered">;

/** The card's level from its `reviews` row; no row means it was never answered. */
export function levelOf(review: ReviewRow | null | undefined): Level {
  if (!review) return 0;
  return review.mastered ? "owned" : review.step;
}

/**
 * How many cards are owned out of the list ("you own 12 of 30"). One entry per card, null or undefined for a card
 * with no `reviews` row. The caller passes visible cards only: a hidden card's review would count toward both numbers.
 */
export function countOwned(reviews: readonly (ReviewRow | null | undefined)[]): {
  owned: number;
  total: number;
} {
  return {
    owned: reviews.filter((review) => levelOf(review) === "owned").length,
    total: reviews.length,
  };
}
