// The optional reasoning-effort knob for chat-completions providers. Pure, so node --test runs it (call-model.ts
// imports server-only and the @ alias, which node --test can't load).

const EFFORTS = ["low", "medium", "high"] as const;

/** How much a reasoning model may think before it answers. */
export type ReasoningEffort = (typeof EFFORTS)[number];

/**
 * Reads `MODEL_<TASK>_REASONING` (`MODEL_EXTRACT_REASONING`, `MODEL_GRADE_REASONING`). Anything but low, medium or high
 * is ignored, not an error: a typo must not take grading down.
 *
 * @param modelEnv - The task's model env var name, such as `MODEL_GRADE`.
 * @param env - The environment to read, `process.env` in the app.
 * @returns The effort, or undefined when unset or invalid.
 */
export function reasoningEffort(
  modelEnv: string,
  env: Record<string, string | undefined>,
): ReasoningEffort | undefined {
  const value = env[`${modelEnv}_REASONING`]?.trim().toLowerCase();
  return EFFORTS.find((effort) => effort === value);
}

/**
 * The request-body field for `effort`: only Groq takes `reasoning_effort`, and without a value the body stays as it
 * was, so the spread adds nothing.
 *
 * @param provider - The provider name from `MODEL_PROVIDER`.
 * @param effort - The effort from `reasoningEffort`.
 * @returns `{ reasoning_effort }` for Groq with an effort, otherwise `{}`.
 */
export function reasoningField(
  provider: string,
  effort: ReasoningEffort | undefined,
): { reasoning_effort?: ReasoningEffort } {
  return provider === "groq" && effort ? { reasoning_effort: effort } : {};
}
