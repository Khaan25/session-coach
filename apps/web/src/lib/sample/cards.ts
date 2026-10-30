import "server-only";

import sample from "@session-coach/shared/fixtures/session.sample.json";
import { decisionCardSchema, type DecisionCard } from "@session-coach/shared/decision";

import type { Score } from "@/components/app/score-badge";

// SAMPLE data for the UI-only pages, from the shared fixture. Server-only: the fixture holds the answer key, so
// everything leaving this module is picked field by field, and the answer key is never one of them.
// TODO(zia): replace with the card queries (explicit column list, never `select *`) in Phases 5 and 6.

const fixtureSession = sample.session;

/** The card columns a learner may read on /s/[id] (plan, Phase 5 step 1). */
export type CardView = Pick<
  DecisionCard,
  "id" | "position" | "decision" | "why" | "source" | "evidence" | "files" | "question" | "flagged"
>;

// Hidden cards are dropped here, as RLS drops them for a learner.
const visibleCards: CardView[] = decisionCardSchema
  .array()
  .parse(sample.cards)
  .filter((card) => !card.hidden)
  .toSorted((a, b) => a.position - b.position)
  .map(({ id, position, decision, why, source, evidence, files, question, flagged }) => ({
    id,
    position,
    decision,
    why,
    source,
    evidence,
    files,
    question,
    flagged,
  }));

/** The visible cards of a session, in order. Only the fixture session has cards. */
export function getSessionCards(sessionId: string): CardView[] {
  return sessionId === fixtureSession.id ? visibleCards : [];
}

/** The review steps (ARCHITECTURE.md, "Schedule"): new, then day 1, 3 and 7, then mastered. */
export type ReviewStep = "new" | "day-1" | "day-3" | "day-7" | "mastered";

export const stepLabels: Record<ReviewStep, string> = {
  new: "New",
  "day-1": "Day 1",
  "day-3": "Day 3",
  "day-7": "Day 7",
  mastered: "Mastered",
};

/** One row of the review queue: what the quiz needs to be found, not the why. */
export type QueueCard = Pick<CardView, "id" | "decision"> & {
  sessionTitle: string;
  step: ReviewStep;
};

/** SAMPLE steps for the fixture's visible cards: one never reviewed, one due for day 1, one due for day 3. */
const sampleSteps: ReviewStep[] = ["new", "day-1", "day-3"];

/** SAMPLE: the cards due today plus never-reviewed cards from the last 7 days, oldest due first (plan, Phase 6 step 4). */
export const sampleQueue: QueueCard[] = visibleCards.map((card, index) => ({
  id: card.id,
  decision: card.decision,
  sessionTitle: fixtureSession.title,
  step: sampleSteps[index] ?? "new",
}));

/** What the quiz page shows before an answer: the decision and the question, never the why or the answer key. */
export type QuizCard = Pick<CardView, "id" | "decision" | "question"> & {
  sessionId: string;
  sessionTitle: string;
};

export function getQuizCard(cardId: string): QuizCard | undefined {
  const card = visibleCards.find(({ id }) => id === cardId);
  if (!card) return undefined;
  return {
    id: card.id,
    decision: card.decision,
    question: card.question,
    sessionId: fixtureSession.id,
    sessionTitle: fixtureSession.title,
  };
}

export const quizCardIds = visibleCards.map(({ id }) => id);

/** SAMPLE grading result for the mock submit. A score of 1 restarts the card at day 1, so it is due tomorrow. */
export const sampleGrade: { score: Score; missing: string; nextDue: string; nextDueLabel: string } =
  {
    score: 1,
    missing: "SAMPLE: the part of the reason your answer left out, as the grader words it.",
    nextDue: "2026-10-30",
    nextDueLabel: "Fri, Oct 30",
  };
