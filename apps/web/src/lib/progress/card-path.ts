import type { Score } from "../../components/app/score-badge.tsx";
import { nextReview, type Step } from "../review/schedule.ts";
import { localDate } from "../sessions/rows.ts";

// /progress teaches the schedule through one of the learner's own cards: its answers replayed through `nextReview`, the
// same rule the grading route applies. Pure, so node --test runs it. Only the decision's title is shown, never its why,
// evidence or answer key.

/** The steps' names by `reviews.step` (or `answers.review_step`): 0 the first try, then the day 1, 4 and 11 reviews. */
const REVIEW_NAMES = ["First answer", "Day 1 review", "Day 4 review", "Day 11 review"] as const;
const STEP_NAMES = ["New", "Day 1", "Day 4", "Day 11"] as const;
const SCORE_NAMES: Record<Score, string> = { 2: "Explained", 1: "Partly", 0: "Missed" };

/** One stop on the card's path: what happened that day and where it left the card. */
export type PathStop = {
  /** "Oct 23", or "Today". */
  date: string;
  what: string;
  score?: Score;
  /** The step the card sat at after this stop: "New", "Day 1" ... "Owned". */
  step: string;
  outcome: string;
};

/** The card's path, ready to show. `next` is its coming review; null once it is owned. */
export type CardPath = {
  decision: string;
  session: string;
  stops: PathStop[];
  next: { date: string; what: string; outcome: string; dueToday: boolean } | null;
};

/** The rows `getCardPath` reads for one of the learner's cards. */
export type CardPathInput = {
  decision: string;
  session: string;
  /** `decision_cards.created_at`. */
  createdAt: string;
  /** The card's `answers`, oldest first. */
  answers: { score: Score; review_step: number; skipped: boolean; created_at: string }[];
  /** The card's `reviews` row. */
  review: { step: number; due_on: string | null; mastered: boolean };
  timeZone: string;
  now: Date;
};

const dayLabel = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/**
 * Replays the card's answers through the schedule, so each stop says why the card moved where it did.
 *
 * @returns The stops, oldest first, and the next review (see `CardPath`).
 */
export function cardPath({
  decision,
  session,
  createdAt,
  answers,
  review,
  timeZone,
  now,
}: CardPathInput): CardPath {
  const today = localDate(timeZone, now);
  const format = (date: string) => dayLabel.format(new Date(`${date}T00:00:00Z`));
  const label = (date: string) => (date === today ? "Today" : format(date));

  const stops: PathStop[] = [
    {
      date: label(localDate(timeZone, new Date(createdAt))),
      what: "Made from your session",
      step: "New",
      outcome: "Waiting for your first answer.",
    },
  ];
  for (const answer of answers) {
    const step = Math.min(Math.max(answer.review_step, 0), 3) as Step;
    const day = localDate(timeZone, new Date(answer.created_at));
    const after = nextReview(step, answer.score, day, answer.skipped);
    const due = !after.due_on ? "" : after.due_on === today ? "today" : format(after.due_on);
    let outcome: string;
    if (after.mastered) outcome = "Explained on day 11: you own this decision.";
    else if (answer.skipped)
      outcome = `You said you don't know yet, so it keeps its step: due ${due}.`;
    else if (step === 0)
      outcome = `${SCORE_NAMES[answer.score]}, so it starts on day 1: due ${due}.`;
    else if (answer.score === 2)
      outcome = `Explained, so it moves up to ${STEP_NAMES[after.step].toLowerCase()}: due ${due}.`;
    else
      outcome = `${SCORE_NAMES[answer.score]}, so it goes back to ${STEP_NAMES[after.step].toLowerCase()}: due ${due}.`;
    stops.push({
      date: label(day),
      what: REVIEW_NAMES[step],
      score: answer.score,
      step: after.mastered ? "Owned" : STEP_NAMES[after.step],
      outcome,
    });
  }

  if (review.mastered || !review.due_on) return { decision, session, stops, next: null };
  const step = Math.min(Math.max(review.step, 1), 3);
  const back = STEP_NAMES[Math.max(step - 1, 1)].toLowerCase();
  return {
    decision,
    session,
    stops,
    next: {
      date: label(review.due_on < today ? today : review.due_on),
      what: REVIEW_NAMES[step],
      outcome:
        step === 3
          ? `Explain it then and you own it. Partly or Missed sends it back to ${back}, due the next day.`
          : `Explain it then and it moves up. Partly or Missed sends it back to ${back}, due the next day.`,
      dueToday: review.due_on <= today,
    },
  };
}
