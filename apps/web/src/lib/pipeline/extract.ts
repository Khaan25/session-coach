import { decisionSourceSchema } from "@session-coach/shared/decision";
import { DEFAULT_QUESTION_LEVEL, type QuestionLevel } from "@session-coach/shared/project";
import { z } from "zod";
import type { ModelInput } from "../model/call-model.ts";
import { sleep as wait } from "../model/retry.ts";
import type { TimelineEvent } from "./parser.ts";

/** Same signature as `callModel`, injected so tests never call a real API. */
export type ExtractModel = (task: "extract", input: ModelInput) => Promise<unknown>;

/** What the question asks at each level. Every level stays answerable from the timeline alone. */
export const QUESTION_LEVELS: Record<QuestionLevel, string> = {
  simple:
    'question: one question that checks the developer understands WHY, not what. Level simple: a one-step "why did we do X" question, answerable in 1 to 2 sentences from the timeline.',
  hard: "question: one question that checks the developer understands WHY, not what. Level hard: ask about the trade-off, or the alternative that was rejected, and what would break if the choice were changed. It must be answerable from the timeline.",
  complex:
    "question: one question that checks the developer understands WHY, not what. Level complex: ask the developer to reason across two decisions from this session, or to predict the effect of a change in a new scenario. Ground it only in evidence from the timeline; never ask about facts the timeline doesn't hold.",
};

/**
 * The extraction prompt for one question level. Only the question line changes; the output shape and evidence rules
 * are the same at every level.
 */
export function extractInstructions(level: QuestionLevel = DEFAULT_QUESTION_LEVEL): string {
  return `You turn one AI coding session into a few review cards for the developer who worked in it.

The timeline arrives as JSON in the user message: { "events": [ { "id": "E1", "kind": "prompt", "text": "..." } ] }.
Each event has an id (E1, E2, ...), a kind and its text. The kinds are prompt, reply, write, edit, bash, read and result. Ids can start at any number because older events may have been cut, and evidence must cite only ids that appear in the timeline.
A prompt is the user's words. A reply is the agent's words. The others are what the agent did.

Who reads the cards: that developer, a few days later, often on a phone, without the code open. They are learning to explain their own project out loud. So every card must make sense without reading code.

Where reasons are in this timeline: mostly in prompts (the developer's plans, rules and constraints, often pasted as long lists) and in replies (the agent's plans and explanations). Write, edit, bash and result events show what happened, rarely why. Ids can jump: the first prompt is always kept, then events after it may have been cut (for example E1, then E57). Prompts often start with working rules for the agent (plan only, do not edit or commit, do not read env files, run the tests). Those are how the session was run, not decisions about the project: never make a card from them.

Return JSON only, exactly this shape:
{ "decisions": [ { "decision": string, "why": string, "source": "stated" | "inferred", "evidence": [ { "event": string, "quote": string } ], "files": [string], "question": string, "model_answer": string } ] }

A decision is a choice between at least two real options that changed the code or the plan. A file write, a deletion, a command or a test result alone is not a decision. Examples: where shared styles live, whether a file may be touched, how data is stored. These are NOT decisions: running a command, reading a file, naming, formatting, writing a commit message. A bug fix is not a decision unless it chose between different approaches.

First choose. Look for the choices a teammate would ask about in a code review ("why did you do it this way?"). Rank them by how much the project would change if the choice had gone the other way. Adding a test, a comment or a log line is not a decision; the choice the test protects can be.

Then write each card:

decision: one short sentence in plain English saying what was chosen, and what it was chosen over when the session names the alternative ("We do X instead of Y."). Do not include the reason: the learner sees this sentence before answering, so it must not give the answer away. Describe things by what they do ("the upload's time limit"), not by code names. Use a code name only when no plain words work, at most once.
why: the reason in plain words, 1 to 2 sentences, as you would explain it to a teammate.
source: “stated” only if the user or the agent wrote the reason somewhere in the timeline. Otherwise “inferred”.
evidence: 1 to 3 items. Each has event (the event id, like E2) and quote: 5 to 30 words copied exactly from that one event. Do not paraphrase, shorten with “...”, fix typos, or join text from two events. If source is “stated”, one quote must contain the reason. At least one quote must state the choice or its reason in words. A file-write line or a shell command does not count as that quote. If no quote states the reason, source must be “inferred” and the why must say the reason is inferred.
files: file paths from write or edit events that belong to this decision, or [] if none.
${QUESTION_LEVELS[level]}
question (style, every level): ask what a teammate would ask out loud, in plain words, under 20 words. Ask for the reason, the trade-off, or what would break; never for something the decision sentence already says.
model_answer: 1 to 2 plain sentences the developer could say out loud.

<examples>
<example>
Poor card: decision "Add a test that asserts \`SYNC_DEADLINE_MS\` > \`UPLOAD_TIMEOUT_MS\` + 2 * \`API_TIMEOUT_MS\`." question "What does the newly added test check?"
Good card: decision "We gave the sync command one time limit for the whole run, set to 3 minutes." why "A slow upload that is still working must be allowed to finish, so the overall limit has to be longer than the upload's own timeout plus two server calls." question "Why must sync's overall time limit be longer than the upload's own timeout?" model_answer "Otherwise it could cut off an upload that was slow but still working; it should only stop a run that is really stuck."
</example>
<example>
"Add a one-line comment explaining the slice logic." This is an action, not a decision: no card.
</example>
<example>
A session that only fixes a typo and runs the tests: { "decisions": [] }
</example>
</examples>

Use only the timeline. Return at most 5 decisions, most important first. If the session has fewer real decisions, return fewer, or an empty list; never invent one to fill the list.`;
}

const modelCardSchema = z.object({
  decision: z.string().min(1),
  why: z.string().min(1),
  source: decisionSourceSchema,
  evidence: z
    .array(
      z
        // E1 is the first event: "E0" or "E01" would point at no event, so the card is dropped here.
        .object({ event: z.string().regex(/^E[1-9]\d*$/), quote: z.string().trim().min(1) })
        // The model cites "E2"; the rest of the pipeline works with the number 2.
        .transform(({ event, quote }) => ({ event_index: Number(event.slice(1)), quote })),
    )
    .min(1)
    .max(3),
  files: z.array(z.string()),
  question: z.string().min(1),
  model_answer: z.string().min(1),
});

/** The most cards one session yields; extra valid cards past this are dropped, most important first. */
export const MAX_CARDS = 5;

/** The answer's outer shape. Cards are parsed one by one (`parseAnswer`), so one bad card can't sink the rest. */
const extractOutputSchema = z.object({ decisions: z.array(z.unknown()) });

/** A card as the model wrote it, before `checkEvidence` verifies the quotes. */
export type ExtractedCard = z.infer<typeof modelCardSchema>;

/** The model's answer failed the schema twice. The message carries the last validation error. */
export class ExtractError extends Error {
  name = "ExtractError";
}

/** How long the retry waits by default: a full minute, so the first call's tokens leave Groq's 8,000 tokens/minute window. */
export const RETRY_DELAY_MS = 60_000;

export type ExtractOptions = {
  /** Wait before the retry, in milliseconds. */
  retryDelayMs?: number;
  /** Does the waiting, cancelled by `signal`; tests pass a fake so they never wait. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  /** Cancels the wait and the model calls. */
  signal?: AbortSignal;
  /** How hard the questions are: the session's project level. Default simple. */
  level?: QuestionLevel;
};

/**
 * Keeps the valid cards of one answer, up to `MAX_CARDS`. Invalid cards are dropped. The answer counts as failed only
 * when its outer shape is wrong, or when it has cards and none of them is valid, so the retry can fix them.
 */
function parseAnswer(answer: unknown): { cards: ExtractedCard[] } | { error: string } {
  const outer = extractOutputSchema.safeParse(answer);
  if (!outer.success) return { error: z.prettifyError(outer.error) };
  const results = outer.data.decisions.map((card) => modelCardSchema.safeParse(card));
  const cards = results.flatMap((result) => (result.success ? [result.data] : []));
  if (cards.length === 0 && results.length > 0) {
    const errors = results.map((result, i) =>
      result.success ? "" : `decisions[${i}]: ${z.prettifyError(result.error)}`,
    );
    return { error: errors.join("\n") };
  }
  return { cards: cards.slice(0, MAX_CARDS) };
}

/**
 * Asks the model for decision cards and keeps the valid ones (see `parseAnswer`). An answer that fails gets one more
 * call, after a wait so it stays under the provider's tokens-per-minute limit. The data carries the failed answer and
 * the validation error so the model can correct it; a second failure throws. Two calls at most.
 *
 * @param events - The parsed timeline; `line` is not sent, the model has no use for it.
 * @param model - `callModel` in production, a fake in tests.
 * @param options - `retryDelayMs` (default `RETRY_DELAY_MS`) and `sleep` change the wait; `signal` cancels; `level`
 *   picks the question level (default simple).
 * @returns 0 to `MAX_CARDS` cards, unverified. Zero is a valid answer: a session can have no real decisions.
 * @throws ExtractError when both answers are invalid. Errors from `model` itself pass through.
 */
export async function extractCards(
  events: readonly TimelineEvent[],
  model: ExtractModel,
  { retryDelayMs = RETRY_DELAY_MS, sleep = wait, signal, level }: ExtractOptions = {},
): Promise<ExtractedCard[]> {
  const instructions = extractInstructions(level);
  const timeline = events.map(({ id, kind, text }) => ({ id, kind, text }));
  const cancel = signal ? { signal } : {};
  const firstAnswer = await model("extract", {
    instructions,
    data: { events: timeline },
    ...cancel,
  });
  const first = parseAnswer(firstAnswer);
  if ("cards" in first) return first.cards;

  await sleep(retryDelayMs, signal);
  signal?.throwIfAborted();
  const second = parseAnswer(
    await model("extract", {
      instructions,
      data: {
        events: timeline,
        previous_answer: firstAnswer,
        validation_error: first.error,
        fix: "Your previous_answer failed validation with the error above. Return the full JSON again with exactly those problems fixed.",
      },
      ...cancel,
    }),
  );
  if ("cards" in second) return second.cards;

  throw new ExtractError(`The model returned invalid cards twice. Last error:\n${second.error}`);
}
