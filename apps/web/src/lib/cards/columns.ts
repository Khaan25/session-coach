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
