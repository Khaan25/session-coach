import { gunzipSync } from "node:zlib";
import { decisionSourceSchema, evidenceSchema } from "@session-coach/shared/decision";
import { z } from "zod";
import { MAX_UPLOAD_BYTES } from "../sessions/upload.ts";
import type { CheckedCard } from "./evidence.ts";
import type { TimelineEvent } from "./parser.ts";

// Pure helpers for processSession, kept apart from process.ts so node --test can load them (process.ts imports
// `server-only` and the `@/` alias).

/**
 * The most timeline we send the model, in characters of the JSON it actually gets (ids, kinds, quotes and escapes
 * included). About 4 characters per token puts this near 4,000 tokens, which leaves room for the instructions and the
 * retry inside Groq's 8,000 tokens per minute.
 */
export const MAX_TIMELINE_CHARS = 16_000;

/** One event's text is cut to this many characters (the start is kept) so a single huge event can't eat the budget. */
export const MAX_EVENT_CHARS = 1_500;

/**
 * Caps each event's text, then keeps events in order until the budget is spent. Each event costs its JSON as
 * `extractCards` sends it, plus one for the comma. An event that doesn't fit ends the timeline, so ids stay E1..En with
 * no gaps and `event_index` still points at the right event.
 *
 * Temporary: Zia's big-session decision (a bigger model, or chunks) replaces this.
 *
 * @param events - The parsed timeline.
 * @returns `kept`: the capped events to send and to check quotes against. `cut`: how many events were left out.
 */
export function trimTimeline(events: readonly TimelineEvent[]): {
  kept: TimelineEvent[];
  cut: number;
} {
  const kept: TimelineEvent[] = [];
  let used = 0;
  for (const event of events) {
    const text = event.text.slice(0, MAX_EVENT_CHARS);
    const size = JSON.stringify({ id: event.id, kind: event.kind, text }).length + 1;
    if (used + size > MAX_TIMELINE_CHARS) break;
    used += size;
    kept.push({ ...event, text });
  }
  return { kept, cut: events.length - kept.length };
}

/** The most a log may unzip to: twice the 50 MB upload limit. A gzip bomb stops here instead of filling memory. */
export const MAX_LOG_BYTES = 2 * MAX_UPLOAD_BYTES;

/** The log unzips to more than `MAX_LOG_BYTES`. */
export class LogTooBigError extends Error {
  name = "LogTooBigError";
}

/**
 * Unzips an uploaded log to text, refusing to grow past `maxBytes`.
 *
 * @param gzipped - The log as stored.
 * @param maxBytes - The unzipped size limit; tests pass a small one.
 * @throws LogTooBigError when the log unzips past `maxBytes`. Other zlib errors (not gzip, truncated) pass through.
 */
export function unzipLog(gzipped: Buffer, maxBytes = MAX_LOG_BYTES): string {
  try {
    return gunzipSync(gzipped, { maxOutputLength: maxBytes }).toString("utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ERR_BUFFER_TOO_LARGE") {
      throw new LogTooBigError(`log unzips past ${maxBytes} bytes`, { cause: error });
    }
    throw error;
  }
}

/** A `decision_cards` insert row: what the pipeline writes. Postgres adds id and created_at and generates flagged/hidden. */
const cardRowSchema = z.object({
  session_id: z.uuid(),
  user_id: z.uuid(),
  position: z.number().int().min(0),
  decision: z.string().min(1),
  why: z.string().min(1),
  source: decisionSourceSchema,
  evidence: z.array(evidenceSchema).min(1),
  files: z.array(z.string()),
  question: z.string().min(1),
  model_answer: z.string().min(1),
});

export type CardRow = z.infer<typeof cardRowSchema>;

/**
 * One insert row per card, numbered 0..n-1 in the order given. Never carries `flagged` or `hidden`.
 *
 * @param cards - Cards from `checkEvidence`.
 * @param sessionId - The session the cards belong to.
 * @param userId - That session's owner.
 * @throws ZodError when a row doesn't match the shared card schema.
 */
export function buildCardRows(
  cards: readonly CheckedCard[],
  sessionId: string,
  userId: string,
): CardRow[] {
  return cards.map((card, position) =>
    cardRowSchema.parse({
      session_id: sessionId,
      user_id: userId,
      position,
      decision: card.decision,
      why: card.why,
      source: card.source,
      evidence: card.evidence,
      files: card.files,
      question: card.question,
      model_answer: card.model_answer,
    }),
  );
}
