// The day 1/3/7 review schedule (ARCHITECTURE.md, "Review loop"). Pure, so node --test runs it.

/** An explain-back score, as written to `answers.score`: wrong, partly, got it. */
export type Score = 0 | 1 | 2;

/** `reviews.step`: 0 never reviewed, then the day 1, 3 and 7 reviews. */
export type Step = 0 | 1 | 2 | 3;

/** What `reviews` holds after an answer. `due_on` is null once mastered (the table's check). */
export type ReviewState = { step: Step; due_on: string | null; mastered: boolean };

/** Days until the next review, by the step just passed: 0 to day 1, 1 to day 3, 2 to day 7. */
const GAP_DAYS = [1, 3, 7] as const;

/** A YYYY-MM-DD date plus whole days, in calendar days (no time zone or DST drift). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The card's next review after an answer at `step`.
 *
 * @param step - The card's current `reviews.step` (0 when it has no reviews row yet).
 * @param score - The grade: 2 advances the card, 0 or 1 restarts it at day 1.
 * @param today - The learner's local date (YYYY-MM-DD), so "tomorrow" is their tomorrow.
 * @returns The new step and due date; passing day 7 (step 3) masters the card.
 */
export function nextReview(step: Step, score: Score, today: string): ReviewState {
  if (score < 2) return { step: 1, due_on: addDays(today, 1), mastered: false };
  if (step === 3) return { step: 3, due_on: null, mastered: true };
  return { step: (step + 1) as Step, due_on: addDays(today, GAP_DAYS[step]), mastered: false };
}
