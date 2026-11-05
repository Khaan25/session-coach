// The review ladder as the learner reads it (New, Day 1, Day 4, Day 11, Owned) and what each answer does to a card on
// it. Every outcome comes from `nextReview`, so the page can't teach a schedule the route doesn't run. Pure, so
// node --test runs it.

import { levelOf, type Level } from "./level.ts";
import { nextReview, type Score, type Step } from "./schedule.ts";

/** The ladder's rungs: index n is `reviews.step` n, then Owned once mastered. */
export const STAGES = ["New", "Day 1", "Day 4", "Day 11", "Owned"] as const;

/** A level's index on the ladder: its step, or the last rung once owned. */
export function stageIndex(level: Level): number {
  return level === "owned" ? STAGES.length - 1 : level;
}

/** Where an answer leaves a card: its new level, and the days until it is back (null once owned). */
export type Outcome = { level: Level; inDays: number | null };

/** What a 2, a 1 or 0, and an "I don't know yet" skip would each do to a card at `step`. */
export type Outcomes = { pass: Outcome; miss: Outcome; skip: Outcome };

// Any date works: nextReview only adds days to it.
const FROM = "2000-01-01";
const DAY_MS = 24 * 60 * 60 * 1000;

function outcome(step: Step, score: Score, skipped: boolean): Outcome {
  const next = nextReview(step, score, FROM, skipped);
  return {
    level: levelOf(next),
    inDays: next.due_on === null ? null : (Date.parse(next.due_on) - Date.parse(FROM)) / DAY_MS,
  };
}

/** The three outcomes for a card at `step`. A 1 and a 0 do the same thing, so `miss` covers both. */
export function outcomesAt(step: Step): Outcomes {
  return {
    pass: outcome(step, 2, false),
    miss: outcome(step, 0, false),
    skip: outcome(step, 0, true),
  };
}

/** An outcome in words, e.g. "Drops to Day 1, back tomorrow." or "You own it. It doesn't come back." */
export function outcomeInWords(from: Step, to: Outcome): string {
  if (to.level === "owned" || to.inDays === null) return "You own it. It doesn't come back.";
  const verb =
    from === 0
      ? "Goes to"
      : to.level > from
        ? "Moves up to"
        : to.level === from
          ? "Stays at"
          : "Drops to";
  const when = to.inDays === 1 ? "back tomorrow" : `back in ${to.inDays} days`;
  return `${verb} ${STAGES[to.level]}, ${when}.`;
}
