import { decisionSourceSchema } from "@session-coach/shared/decision";
import { z } from "zod";
import type { ModelInput } from "../model/call-model.ts";
import type { TimelineEvent } from "./parser.ts";

/** Same signature as `callModel`, injected so tests never call a real API. */
export type ExtractModel = (task: "extract", input: ModelInput) => Promise<unknown>;

export const EXTRACT_INSTRUCTIONS = `You find the decisions an AI coding agent made in one working session.

The timeline arrives as JSON in the user message: { "events": [ { "id": "E1", "kind": "prompt", "text": "..." } ] }.
Each event has an id (E1, E2, ...), a kind and its text. The kinds are prompt, reply, write, edit, bash, read and result. Ids can start at any number because older events may have been cut, and evidence must cite only ids that appear in the timeline.
A prompt is the user's words. A reply is the agent's words. The others are what the agent did.

Return JSON only, exactly this shape:
{ "decisions": [ { "decision": string, "why": string, "source": "stated" | "inferred", "evidence": [ { "event": string, "quote": string } ], "files": [string], "question": string, "model_answer": string } ] }

A decision is a choice between at least two real options that changed the code or the plan. A file write, a deletion, a command or a test result alone is not a decision. Examples: where shared styles live, whether a file may be touched, how data is stored. These are NOT decisions: running a command, reading a file, naming, formatting, writing a commit message. A bug fix is not a decision unless it chose between different approaches.

For each decision:

decision: one plain sentence.
why: the reason in plain words.
source: “stated” only if the user or the agent wrote the reason somewhere in the timeline. Otherwise “inferred”.
evidence: 1 to 3 items. Each has event (the event id, like E2) and quote: 5 to 30 words copied exactly from that one event. Do not paraphrase, shorten with “...”, fix typos, or join text from two events. If source is “stated”, one quote must contain the reason. At least one quote must state the choice or its reason in words. A file-write line or a shell command does not count as that quote. If no quote states the reason, source must be “inferred” and the why must say the reason is inferred.
files: file paths from write or edit events that belong to this decision, or [] if none.
question: one question that checks the developer understands WHY, not what. It must be answerable from the timeline.
model_answer: 1 to 2 sentences.

Use only the timeline. Return 3 to 5 decisions, most important first.`;

const modelCardSchema = z.object({
  decision: z.string().min(1),
  why: z.string().min(1),
  source: decisionSourceSchema,
  evidence: z
    .array(
      z
        .object({ event: z.string().regex(/^E\d+$/), quote: z.string().trim().min(1) })
        // The model cites "E2"; the rest of the pipeline works with the number 2.
        .transform(({ event, quote }) => ({ event_index: Number(event.slice(1)), quote })),
    )
    .min(1)
    .max(3),
  files: z.array(z.string()),
  question: z.string().min(1),
  model_answer: z.string().min(1),
});

/** What the model must return: 3 to 5 decisions. `checkEvidence` later drops the ones with no grounded quote. */
export const extractOutputSchema = z.object({ decisions: z.array(modelCardSchema).min(3).max(5) });

/** A card as the model wrote it, before `checkEvidence` verifies the quotes. */
export type ExtractedCard = z.infer<typeof modelCardSchema>;

/** The model's answer failed the schema twice. `cause` is the last zod error. */
export class ExtractError extends Error {
  name = "ExtractError";
}

/** How long the retry waits by default: a full minute, so the first call's tokens leave Groq's 8,000 tokens/minute window. */
export const RETRY_DELAY_MS = 60_000;

export type ExtractOptions = {
  /** Wait before the retry, in milliseconds. */
  retryDelayMs?: number;
  /** Does the waiting; tests pass a fake so they never wait. */
  sleep?: (ms: number) => Promise<void>;
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Asks the model for decision cards. An answer that fails the schema gets one more call, after a wait so it stays
 * under the provider's tokens-per-minute limit. The data carries the failed answer and the validation error so the
 * model can correct it; a second failure throws. Two calls at most.
 *
 * @param events - The parsed timeline; `line` is not sent, the model has no use for it.
 * @param model - `callModel` in production, a fake in tests.
 * @param options - `retryDelayMs` (default `RETRY_DELAY_MS`) and `sleep`, to change the wait.
 * @returns 3 to 5 cards, unverified.
 * @throws ExtractError when both answers are invalid. Errors from `model` itself pass through.
 */
export async function extractCards(
  events: readonly TimelineEvent[],
  model: ExtractModel,
  { retryDelayMs = RETRY_DELAY_MS, sleep = wait }: ExtractOptions = {},
): Promise<ExtractedCard[]> {
  const timeline = events.map(({ id, kind, text }) => ({ id, kind, text }));
  const firstAnswer = await model("extract", {
    instructions: EXTRACT_INSTRUCTIONS,
    data: { events: timeline },
  });
  const first = extractOutputSchema.safeParse(firstAnswer);
  if (first.success) return first.data.decisions;

  const validationError = z.prettifyError(first.error);
  await sleep(retryDelayMs);
  const second = extractOutputSchema.safeParse(
    await model("extract", {
      instructions: EXTRACT_INSTRUCTIONS,
      data: {
        events: timeline,
        previous_answer: firstAnswer,
        validation_error: validationError,
        fix: "Your previous_answer failed validation with the error above. Return the full JSON again with exactly those problems fixed.",
      },
    }),
  );
  if (second.success) return second.data.decisions;

  throw new ExtractError(
    `The model returned invalid cards twice. Last error:\n${z.prettifyError(second.error)}`,
    { cause: second.error },
  );
}
