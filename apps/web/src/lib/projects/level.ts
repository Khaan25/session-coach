// What each question level means to a learner, and how a stored value maps to a level. Pure, so node --test runs it.

import {
  DEFAULT_QUESTION_LEVEL,
  questionLevelSchema,
  type QuestionLevel,
} from "@session-coach/shared/project";

/** The three levels in order, with the label and the one-line example the picker shows. */
export const QUESTION_LEVEL_OPTIONS: readonly {
  value: QuestionLevel;
  label: string;
  example: string;
}[] = [
  {
    value: "simple",
    label: "Simple",
    example: "Why did we keep the shared styles in one tokens file?",
  },
  {
    value: "hard",
    label: "Hard",
    example: "What would break if each component kept its own styles instead?",
  },
  {
    value: "complex",
    label: "Complex",
    example:
      "If a second app reused these components, how would the tokens and build choices change?",
  },
];

/** A stored or missing level as a level: no project row, no repo or an unknown value all mean the default (simple). */
export function levelOrDefault(value: unknown): QuestionLevel {
  return questionLevelSchema.catch(DEFAULT_QUESTION_LEVEL).parse(value);
}
