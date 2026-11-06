// The review schedule (gaps of 1, 3, then 7 days: reviews on day 1, 4 and 11) (ARCHITECTURE.md, "Review loop"). Pure, so node --test runs it.

/** An explain-back score, as written to `answers.score`: wrong, partly, got it. */
export type Score = 0 | 1 | 2;

/** `reviews.step`: 0 never reviewed, then the day 1, 4 and 11 reviews. */
export type Step = 0 | 1 | 2 | 3;

/** What `reviews` holds after an answer. `due_on` is null once mastered (the table's check). */
export type ReviewState = { step: Step; due_on: string | null; mastered: boolean };

/** Days until the next review, by the step just passed: 0 to day 1, 1 to day 4, 2 to day 11. */
const GAP_DAYS = [1, 3, 7] as const;

/**
 * "Due today": not mastered and `due_on` on or before the learner's today (`localDate` in their `profiles.timezone`).
 * The queue and dashboard count filter on the same thing in SQL (`lib/review/queries.ts`); the daily email uses this.
 */
export function isDue(review: Pick<ReviewState, "due_on" | "mastered">, today: string): boolean {
  return !review.mastered && review.due_on !== null && review.due_on <= today;
}

/** How long a never-answered card stays offered: the review queue and the daily email both stop after this. */
export const NEW_CARD_DAYS = 7;

/**
 * The oldest `created_at` a new card can have and still be offered, as an ISO timestamp (a rolling window, not a
 * calendar day, so a learner back from a break isn't handed the whole backlog).
 */
export function newCardsSince(now: Date): string {
  return new Date(now.getTime() - NEW_CARD_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

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
 * @param score - The grade: 2 advances the card, 0 or 1 moves it one step down (never below step 1), due tomorrow.
 * @param today - The learner's local date (YYYY-MM-DD), so "tomorrow" is their tomorrow.
 * @param skipped - An honest "I don't know yet" (scored 0): it costs nothing, so the card keeps its step (at least 1)
 *   and comes back tomorrow, where a wrong answer would drop it a step.
 * @returns The new step and due date; passing the day-11 review (step 3) masters the card.
 */
export function nextReview(step: Step, score: Score, today: string, skipped = false): ReviewState {
  if (score < 2)
    return {
      step: Math.max(skipped ? step : step - 1, 1) as Step,
      due_on: addDays(today, 1),
      mastered: false,
    };
  if (step === 3) return { step: 3, due_on: null, mastered: true };
  return { step: (step + 1) as Step, due_on: addDays(today, GAP_DAYS[step]), mastered: false };
}

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/**
 * A due date in words, for "Your next card is due ...": "tomorrow", or "on Thursday 5 November".
 *
 * @param due - YYYY-MM-DD, after `today`.
 * @param today - The learner's today, YYYY-MM-DD.
 */
export function dueInWords(due: string, today: string): string {
  if (due === addDays(today, 1)) return "tomorrow";
  return `on ${dayFormat.format(new Date(`${due}T00:00:00Z`))}`;
}
