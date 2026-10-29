// MODEL_PROVIDER=fake: a deterministic stand-in for local development and tests, so grading runs without model keys.
// callModel refuses it when NODE_ENV=production. Pure, so node --test runs it.

const words = (text: string) => new Set(text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);

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

/**
 * The fake model's output for a task, as a parsed JSON value like the real providers return.
 *
 * @param task - The model job; only "grade" exists so far.
 * @param data - The call's data.
 * @throws For any task but "grade", so a missing fake fails loudly instead of returning nonsense.
 */
export function fakeModel(task: string, data: Record<string, unknown>): unknown {
  if (task === "grade") return fakeGrade(data);
  throw new Error(`The fake model provider only implements "grade", not "${task}"`);
}
