// MODEL_PROVIDER=fake: a deterministic stand-in for local development and tests, so extraction and grading run without
// model keys.
// callModel refuses it when NODE_ENV=production. Pure, so node --test runs it.

import { wordCount } from "../pipeline/evidence.ts";

const WORD = /[a-z0-9]{3,}/g;

const words = (text: string) => new Set(text.toLowerCase().match(WORD) ?? []);

/**
 * Grades by word overlap with the model answer: at least 60% of its words scores 2, at least 25% scores 1, else 0.
 * Copy the model answer to get a 2; answer off-topic to get a 0.
 *
 * @param data - The grading call's data; only `model_answer` and `answer` are read.
 * @returns The same `{ score, missing }` shape the real grader must return.
 */
export function fakeGrade(data: { model_answer?: unknown; answer?: unknown }) {
  const key = words(String(data.model_answer ?? ""));
  const answer = words(String(data.answer ?? ""));
  const hits = [...key].filter((word) => answer.has(word)).length;
  const ratio = key.size === 0 ? 0 : hits / key.size;
  const score = ratio >= 0.6 ? 2 : ratio >= 0.25 ? 1 : 0;
  return {
    score,
    missing: score === 2 ? "" : `FAKE: your answer covered ${hits} of ${key.size} key words.`,
  };
}

/** The most cards the fake returns: the real limit is 5, 3 is enough to click through. */
const FAKE_CARDS = 3;

const WHITESPACE = /\s+/;

/**
 * Extracts one card per prompt or reply of at least 5 words, up to 3, quoting that event's first 12 words. The quote is
 * copied from the event, so every card passes `checkEvidence` and a local push ends `ready` with cards.
 *
 * @param data - The extraction call's data; only `events` (`{ id, kind, text }[]`) is read.
 * @returns The same `{ decisions }` shape the real extractor must return; empty when no event qualifies.
 */
export function fakeExtract(data: { events?: unknown }) {
  const events = Array.isArray(data.events) ? data.events : [];
  const decisions = events
    .flatMap((event: { id?: unknown; kind?: unknown; text?: unknown }) => {
      if (event.kind !== "prompt" && event.kind !== "reply") return [];
      const quote = String(event.text ?? "")
        .trim()
        .split(WHITESPACE)
        .slice(0, 12)
        .join(" ");
      // The same word count `checkEvidence` uses, so punctuation-only tokens don't make a card it then drops.
      if (typeof event.id !== "string" || wordCount(quote) < 5) return [];
      return [{ id: event.id, quote }];
    })
    .slice(0, FAKE_CARDS)
    .map(({ id, quote }) => ({
      decision: `FAKE: the decision in ${id}.`,
      why: `FAKE: the reason given in ${id}.`,
      source: "stated",
      evidence: [{ event: id, quote }],
      files: [],
      question: `FAKE: why was the choice in ${id} made?`,
      model_answer: `FAKE: because ${quote}`,
    }));
  return { decisions };
}

/**
 * The fake model's output for a task, as a parsed JSON value like the real providers return.
 *
 * @param task - The model job: "grade" or "extract".
 * @param data - The call's data.
 * @throws For any other task, so a missing fake fails loudly instead of returning nonsense.
 */
export function fakeModel(task: string, data: Record<string, unknown>): unknown {
  if (task === "grade") return fakeGrade(data);
  if (task === "extract") return fakeExtract(data);
  throw new Error(`The fake model provider has no "${task}"`);
}
