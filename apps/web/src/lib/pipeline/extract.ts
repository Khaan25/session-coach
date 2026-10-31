import { decisionSourceSchema } from "@session-coach/shared/decision";
import { z } from "zod";
import type { ModelInput } from "../model/call-model.ts";
import type { TimelineEvent } from "./parser.ts";

/** Same signature as `callModel`, injected so tests never call a real API. */
export type ExtractModel = (task: "extract", input: ModelInput) => Promise<unknown>;

export const EXTRACT_INSTRUCTIONS = `You find the decisions an AI coding agent made in one working session.

The timeline arrives as JSON in the user message: { "events": [ { "id": "E1", "kind": "prompt", "text": "..." } ] }.
Each event has an id (E1, E2, ...), a kind and its text. The kinds are prompt, reply, write, edit, bash, read and result.
A prompt is the user's words. A reply is the agent's words. The others are what the agent did.

Return JSON only, exactly this shape:
{ "cards": [ { "decision": string, "why": string, "source": "stated" | "inferred", "evidence": [ { "event_index": number, "quote": string } ], "files": [string], "question": string, "model_answer": string } ] }

A decision is a choice between at least two real options that changed the code or the plan. A file write, a deletion, a command or a test result alone is not a decision. Examples: where shared styles live, whether a file may be touched, how data is stored. These are NOT decisions: running a command, reading a file, naming, formatting, writing a commit message. A bug fix is not a decision unless it chose between different approaches.

For each decision:

decision: one plain sentence.
why: the reason in plain words.
source: “stated” only if the user or the agent wrote the reason somewhere in the timeline. Otherwise “inferred”.
evidence: 1 to 3 items. Each has event_index (the number after E) and quote: 5 to 30 words copied exactly from that one event. Do not paraphrase, shorten with “...”, fix typos, or join text from two events. If source is “stated”, one quote must contain the reason. At least one quote must state the choice or its reason in words. A file-write line or a shell command does not count as that quote. If no quote states the reason, source must be “inferred” and the why must say the reason is inferred.
files: file paths from write or edit events that belong to this decision, or [] if none.
question: one question that checks the developer understands WHY, not what. It must be answerable from the timeline.
model_answer: 1 to 2 sentences.

Use only the timeline. Return at most 5, most important first. Return fewer cards when there are fewer real decisions. Zero cards is a valid answer; never pad to reach a number.`;

const modelCardSchema = z.object({
  decision: z.string().min(1),
  why: z.string().min(1),
  source: decisionSourceSchema,
  evidence: z
    .array(z.object({ event_index: z.number().int().positive(), quote: z.string().min(1) }))
    .min(1)
    .max(3),
  files: z.array(z.string()),
  question: z.string().min(1),
  model_answer: z.string().min(1),
});

/** What the model must return: 0 to 5 cards, so a session with no real decision gives an empty list. */
export const extractOutputSchema = z.object({ cards: z.array(modelCardSchema).max(5) });

/** A card as the model wrote it, before `checkEvidence` verifies the quotes. */
export type ExtractedCard = z.infer<typeof modelCardSchema>;

/** The model's answer failed the schema twice. `cause` is the last zod error. */
export class ExtractError extends Error {
  name = "ExtractError";
}

/**
 * Asks the model for decision cards. An answer that fails the schema gets one more call, with the validation error in
 * the data so the model can fix it; a second failure throws. Two calls at most.
 *
 * @param events - The parsed timeline; `line` is not sent, the model has no use for it.
 * @param model - `callModel` in production, a fake in tests.
 * @returns 0 to 5 cards, unverified.
 * @throws ExtractError when both answers are invalid. Errors from `model` itself pass through.
 */
export async function extractCards(
  events: readonly TimelineEvent[],
  model: ExtractModel,
): Promise<ExtractedCard[]> {
  const timeline = events.map(({ id, kind, text }) => ({ id, kind, text }));
  const first = extractOutputSchema.safeParse(
    await model("extract", { instructions: EXTRACT_INSTRUCTIONS, data: { events: timeline } }),
  );
  if (first.success) return first.data.cards;

  const validationError = z.prettifyError(first.error);
  const second = extractOutputSchema.safeParse(
    await model("extract", {
      instructions: EXTRACT_INSTRUCTIONS,
      data: {
        events: timeline,
        validation_error: validationError,
        fix: "Your previous answer failed validation with the error above. Return the full JSON again with exactly those problems fixed.",
      },
    }),
  );
  if (second.success) return second.data.cards;

  throw new ExtractError(
    `The model returned invalid cards twice. Last error:\n${z.prettifyError(second.error)}`,
    { cause: second.error },
  );
}
