import "server-only";

import { fakeModel } from "@/lib/model/fake";

/** A model job. Each reads its model name from `MODEL_<TASK>` (`MODEL_GRADE`, `MODEL_EXTRACT`). */
export type ModelTask = "extract" | "grade";

/** `instructions` go in the system prompt; `data` is sent as JSON in the user message. */
export type ModelInput = { instructions: string; data: Record<string, unknown> };

/** The provider or model env vars are unset or wrong. Routes answer 503: grading isn't configured. */
export class ModelConfigError extends Error {
  name = "ModelConfigError";
}

/** The provider failed, timed out or returned something that isn't JSON, twice. Routes answer 502. */
export class ModelCallError extends Error {
  name = "ModelCallError";
}

const KEY_ENV = {
  gemini: "GEMINI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  groq: "GROQ_API_KEY",
} as const;

type Provider = keyof typeof KEY_ENV;

/** OpenAI-compatible chat-completions endpoints. */
const CHAT_URL = {
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
} as const;

const TIMEOUT_MS = 30_000;

/**
 * Calls the model configured for `task` and returns its JSON output, parsed but not validated: the caller checks the
 * shape with zod. The provider comes from `MODEL_PROVIDER` (gemini, openrouter, groq; `fake` in development and tests
 * only) and the model from `MODEL_<TASK>`, so switching either is config, not code. A failed call is retried once.
 *
 * @throws ModelConfigError when the env vars are unset or name an unknown provider.
 * @throws ModelCallError when both attempts fail or return non-JSON.
 */
export async function callModel(task: ModelTask, input: ModelInput): Promise<unknown> {
  const provider = process.env.MODEL_PROVIDER;
  if (provider === "fake") {
    if (process.env.NODE_ENV === "production")
      throw new ModelConfigError("MODEL_PROVIDER=fake is for development and tests only");
    return fakeModel(task, input.data);
  }
  if (provider !== "gemini" && provider !== "openrouter" && provider !== "groq")
    throw new ModelConfigError("MODEL_PROVIDER must be gemini, openrouter or groq");
  const modelEnv = `MODEL_${task.toUpperCase()}`;
  const model = process.env[modelEnv];
  const key = process.env[KEY_ENV[provider]];
  if (!model || !key)
    throw new ModelConfigError(`${modelEnv} and ${KEY_ENV[provider]} must be set`);

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const text = await request(provider, model, key, input);
      // Some models wrap JSON in a markdown fence even when asked not to.
      return JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
    } catch (error) {
      lastError = error;
    }
  }
  throw new ModelCallError(`${provider} ${task} call failed twice`, { cause: lastError });
}

/** One HTTP call; returns the model's text. */
async function request(provider: Provider, model: string, key: string, input: ModelInput) {
  const user = JSON.stringify(input.data);
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  if (provider === "gemini") {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: input.instructions }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
        signal,
      },
    );
    if (!response.ok) throw new Error(`gemini answered ${response.status}`);
    const body = await response.json();
    return String(body?.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
  }
  const response = await fetch(CHAT_URL[provider], {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: input.instructions },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
    signal,
  });
  if (!response.ok) throw new Error(`${provider} answered ${response.status}`);
  const body = await response.json();
  return String(body?.choices?.[0]?.message?.content ?? "");
}
