import type { DecisionCard } from "@session-coach/shared/decision";

/**
 * The card columns /s/[id] shows for an answered card (plan, Phase 5 step 1), by name. Learners can't read `why`,
 * `evidence` or `model_answer` (column grants), so the server reads these with the service role after checking the
 * card is the learner's and answered (`lib/cards/queries.ts`). Never model_answer.
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
  return heads.map(({ id, position, decision, question }) => {
    const card = byId.get(id);
    // Only the head's own fields, by name: a wider row passed as a head can't carry its why onto the page.
    return card ? { ...card, locked: false } : { id, position, decision, question, locked: true };
  });
}
