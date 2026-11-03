import type { DecisionCard } from "@session-coach/shared/decision";

/**
 * The card columns a learner may read on /s/[id] (plan, Phase 5 step 1), by name. Never model_answer: the column
 * grant refuses it to learners, so `select *` fails.
 */
export const CARD_COLUMNS =
  "id, position, decision, why, source, evidence, files, question, flagged";

/** One card as /s/[id] and the review show it: the learner-readable columns, no answer key. */
export type CardView = Pick<
  DecisionCard,
  "id" | "position" | "decision" | "why" | "source" | "evidence" | "files" | "question" | "flagged"
>;

/** The columns of a card the learner hasn't answered yet: what was decided and the question, never the reason. */
export const CARD_HEAD_COLUMNS = "id, position, decision, question";

export type CardHead = Pick<CardView, "id" | "position" | "decision" | "question">;

/** A card on /s/[id]: locked (decision and question only) until the learner answers it or says they don't know. */
export type SessionCard = (CardHead & { locked: true }) | (CardView & { locked: false });

/**
 * Pairs each card with its full columns when the learner has answered it, and keeps only the head otherwise, so the why
 * and the evidence never reach the page for a card still to be answered.
 *
 * @param heads - Every visible card of the session, in order.
 * @param revealed - Full rows, read only for the answered cards.
 */
export function lockUnanswered(heads: CardHead[], revealed: CardView[]): SessionCard[] {
  const byId = new Map(revealed.map((card) => [card.id, card]));
  return heads.map((head) => {
    const card = byId.get(head.id);
    return card ? { ...card, locked: false } : { ...head, locked: true };
  });
}
