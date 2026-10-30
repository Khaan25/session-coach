import type { Score } from "../../components/app/score-badge.tsx";
import { localDate } from "../sessions/rows.ts";

// Pure progress maths for /progress (plan, Phase 7), so node --test runs it. Definitions from ARCHITECTURE.md:
// "decisions you can still explain" = mastered cards + cards scored 2 in the last 7 days, each card counted once.

/** Where a card sits in the review schedule: never reviewed, next due on day 1, 3 or 7, or mastered. */
export type ReviewStep = "new" | "day-1" | "day-3" | "day-7" | "mastered";

/** What the progress page calls each step. Its key order is the schedule's order, which `REVIEW_STEPS` relies on. */
export const stepLabels: Record<ReviewStep, string> = {
  new: "New",
  "day-1": "Day 1",
  "day-3": "Day 3",
  "day-7": "Day 7",
  mastered: "Mastered",
};

/** The steps in schedule order; index n is `reviews.step` n, so `REVIEW_STEPS[step]` maps a row to its step. */
export const REVIEW_STEPS = Object.keys(stepLabels) as ReviewStep[];

/** Days in the answers chart and the score mix. */
export const CHART_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The learner's rows, read by `getProgress()`. */
export type ProgressInput = {
  /** The learner's visible cards (RLS drops hidden ones). Reviews and answers of other cards are ignored. */
  cards: { id: string; session_id: string }[];
  /** `reviews` rows: `step` 0 = not reviewed since the first try, 1-3 = next due on day 1/3/7. */
  reviews: { card_id: string; step: number; mastered: boolean }[];
  /** `answers` rows from at least the last CHART_DAYS days. */
  answers: { card_id: string; score: Score; created_at: string }[];
  /** Ready sessions that have cards, for the per-session list. */
  sessions: { id: string; title: string | null; repo: string | null; branch: string | null }[];
  /** The learner's IANA time zone, so a day is their day. */
  timeZone: string;
  /** The current time, passed in so tests can pin it and the page never reads the clock in render. */
  now: Date;
};

/** Everything /progress shows. */
export type Progress = {
  /** The headline: mastered cards plus cards scored 2 in the last 7 days, each counted once. */
  canStillExplain: number;
  /** Visible cards, the headline's denominator. */
  totalCards: number;
  /** How many cards sit at each step. */
  steps: Record<ReviewStep, number>;
  /** One entry per day, oldest first, ending today: "Oct 29". */
  answersPerDay: { day: string; answers: number }[];
  /** Answers by score over the same days. */
  scoreMix: Record<Score, number>;
  /** Mastered and total visible cards per ready session; sessions with no visible cards are left out. */
  bySession: { id: string; title: string; mastered: number; total: number }[];
};

/** A card's step from its `reviews` row; no row means it was never answered. */
function stepOf(review: { step: number; mastered: boolean } | undefined): ReviewStep {
  if (!review) return "new";
  if (review.mastered) return "mastered";
  return REVIEW_STEPS[review.step] ?? "new";
}

/** The last `count` local dates (YYYY-MM-DD), oldest first, ending on today in `timeZone`. */
function lastDays(timeZone: string, now: Date, count: number): string[] {
  const [y, m, d] = localDate(timeZone, now).split("-").map(Number) as [number, number, number];
  // Calendar arithmetic in UTC, so a DST change never skips or repeats a day.
  return Array.from({ length: count }, (_, i) =>
    new Date(Date.UTC(y, m - 1, d - (count - 1 - i))).toISOString().slice(0, 10),
  );
}

const dayLabel = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/**
 * Turns the learner's rows into the numbers /progress shows. Pure, so the headline definition is pinned by a test
 * rather than by whatever a query happens to return.
 *
 * - Only visible cards count: reviews and answers of a hidden or unknown card are dropped first.
 * - The headline is a set of card ids, so a mastered card that was also scored 2 this week counts once.
 * - Days are the learner's local days, so an answer at 23:30 in Karachi lands on that day, not the UTC one.
 *
 * @param input - The learner's cards, reviews, recent answers, ready sessions, time zone and the current time.
 * @returns The page's numbers; see `Progress`.
 */
export function computeProgress({
  cards,
  reviews,
  answers,
  sessions,
  timeZone,
  now,
}: ProgressInput): Progress {
  const visible = new Set(cards.map(({ id }) => id));
  const reviewOf = new Map(
    reviews.filter((r) => visible.has(r.card_id)).map((r) => [r.card_id, r]),
  );
  const ownAnswers = answers.filter((a) => visible.has(a.card_id));

  const weekAgo = now.getTime() - 7 * DAY_MS;
  const explainable = new Set<string>();
  for (const [id, review] of reviewOf) if (review.mastered) explainable.add(id);
  for (const a of ownAnswers) {
    const at = Date.parse(a.created_at);
    if (a.score === 2 && at >= weekAgo && at <= now.getTime()) explainable.add(a.card_id);
  }

  const steps: Record<ReviewStep, number> = {
    new: 0,
    "day-1": 0,
    "day-3": 0,
    "day-7": 0,
    mastered: 0,
  };
  for (const { id } of cards) steps[stepOf(reviewOf.get(id))] += 1;

  const days = lastDays(timeZone, now, CHART_DAYS);
  const perDay = new Map(days.map((day) => [day, 0]));
  const scoreMix: Record<Score, number> = { 0: 0, 1: 0, 2: 0 };
  for (const a of ownAnswers) {
    const day = localDate(timeZone, new Date(a.created_at));
    const count = perDay.get(day);
    if (count === undefined) continue;
    perDay.set(day, count + 1);
    scoreMix[a.score] += 1;
  }

  const bySession = sessions
    .map(({ id, title, repo, branch }) => {
      const own = cards.filter((c) => c.session_id === id);
      return {
        id,
        title: title || [repo, branch].filter(Boolean).join(" on ") || "Untitled session",
        mastered: own.filter((c) => reviewOf.get(c.id)?.mastered).length,
        total: own.length,
      };
    })
    .filter(({ total }) => total > 0);

  return {
    canStillExplain: explainable.size,
    totalCards: cards.length,
    steps,
    answersPerDay: days.map((day) => ({
      day: dayLabel.format(new Date(`${day}T00:00:00Z`)),
      answers: perDay.get(day) ?? 0,
    })),
    scoreMix,
    bySession,
  };
}
