import type { Score } from "../../components/app/score-badge.tsx";
import { localDate } from "../sessions/rows.ts";

// Pure progress maths for /progress (plan, Phase 7), so node --test runs it. Definitions from ARCHITECTURE.md:
// "decisions you can still explain" = mastered cards + cards scored 2 in the last 7 days, each card counted once.

/** Where a card sits in the review schedule: never reviewed, next due on day 1, 3 or 7, or mastered. */
export type ReviewStep = "new" | "day-1" | "day-3" | "day-7" | "mastered";

export const stepLabels: Record<ReviewStep, string> = {
  new: "New",
  "day-1": "Day 1",
  "day-3": "Day 3",
  "day-7": "Day 7",
  mastered: "Mastered",
};

export const REVIEW_STEPS = Object.keys(stepLabels) as ReviewStep[];

/** Days in the answers chart and the score mix. */
export const CHART_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

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
  now: Date;
};

export type Progress = {
  canStillExplain: number;
  totalCards: number;
  steps: Record<ReviewStep, number>;
  /** One entry per day, oldest first, ending today: "Oct 29". */
  answersPerDay: { day: string; answers: number }[];
  /** Answers by score over the same days. */
  scoreMix: Record<Score, number>;
  bySession: { id: string; title: string; mastered: number; total: number }[];
};

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
