// The prototype's stand-in grader: no model, it looks for each key idea's words in the answer. One point per idea found.

/** One idea the answer should hold: any of `words` counts, and `missing` is what the result says when none is there. */
export type KeyIdea = { words: string[]; missing: string };

/** Whole word or phrase, plus a plain suffix, so "id" counts in "ids" but not in "provide" or "idea". */
const hasWord = (text: string, word: string) =>
  new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:s|es|d|ed|ing)?\\b`).test(text);

/** 0, 1 or 2 key ideas found, matching the real grader's scale. `missing` is the first idea not found. */
export function grade(
  ideas: KeyIdea[],
  answer: string,
): { score: 0 | 1 | 2; missing: string | null } {
  const text = answer.toLowerCase();
  const found = ideas.filter((idea) => idea.words.some((word) => hasWord(text, word)));
  const missing = ideas.find((idea) => !found.includes(idea))?.missing ?? null;
  return { score: Math.min(found.length, 2) as 0 | 1 | 2, missing };
}
