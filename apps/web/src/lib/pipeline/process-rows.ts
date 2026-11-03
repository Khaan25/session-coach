import { gunzipSync } from "node:zlib";
import { decisionSourceSchema, evidenceSchema } from "@session-coach/shared/decision";
import { z } from "zod";
import { cleanPromptTitle } from "../sessions/name.ts";
import { MAX_UPLOAD_BYTES } from "../sessions/upload.ts";
import type { CheckedCard } from "./evidence.ts";
import type { TimelineEvent } from "./parser.ts";

// Pure helpers for processSession, kept apart from process.ts so node --test can load them (process.ts imports
// `server-only` and the `@/` alias).

/**
 * The most timeline we send the model, in characters of the JSON it actually gets (ids, kinds, quotes and escapes
 * included). At about 3 characters per token this is near 4,500 of Groq's 8,000 tokens per minute, so room for the
 * instructions, the answer and a retry is tight (docs/DECISIONS.md, "Timeline trim budget" and "Plain-language cards").
 */
export const MAX_TIMELINE_CHARS = 13_500;

/** One event's text is cut to this many characters (the start is kept) so a single huge event can't eat the budget. */
export const MAX_EVENT_CHARS = 1_500;

/**
 * Caps each event's text, always keeps the first prompt (the developer's plan and reasons usually start there), then
 * fills the rest of the budget with the newest events (the end of a session holds the decisions that shipped) and
 * drops the older ones whole. Each event costs its JSON as `extractCards` sends it, plus one for the comma, and the
 * first prompt counts toward the budget. Kept events stay in time order and keep their original ids, so a timeline may
 * run E1, E57, E58: `event_index` still names the right event, but it is no longer a position in `kept`. If the first
 * prompt alone is over budget, its text is cut to `budget` code points and it is sent alone. With no prompt, or if
 * the newest event alone is over budget, that newest event is cut the same way and sent alone.
 *
 * Temporary: Zia's big-session decision (a bigger model, or chunks) replaces this.
 *
 * @param events - The parsed timeline.
 * @param budget - The most timeline to keep, in characters of the JSON sent.
 * @returns `kept`: the capped events to send and to check quotes against. `cut`: how many other events were left out.
 */
export function trimTimeline(
  events: readonly TimelineEvent[],
  budget: number = MAX_TIMELINE_CHARS,
): {
  kept: TimelineEvent[];
  cut: number;
} {
  const first = events.findIndex((event) => event.kind === "prompt");
  const kept: TimelineEvent[] = [];
  let used = 0;
  if (first >= 0) {
    const { chars, size } = capEvent(events[first]);
    const text = size > budget ? chars.slice(0, budget).join("") : chars.join("");
    if (size > budget) return { kept: [{ ...events[first], text }], cut: events.length - 1 };
    used = size;
    kept.push({ ...events[first], text });
  }
  const tail: TimelineEvent[] = [];
  // Stop before the first prompt: it is already kept, so it is never kept twice.
  for (let i = events.length - 1; i > first; i--) {
    const event = events[i];
    const { chars, size } = capEvent(event);
    let text = chars.join("");
    if (used + size > budget) {
      if (kept.length + tail.length > 0) break;
      text = chars.slice(0, budget).join("");
    }
    used += size;
    tail.push({ ...event, text });
  }
  kept.push(...tail.reverse());
  return { kept, cut: events.length - kept.length };
}

/** An event's text as code points cut to `MAX_EVENT_CHARS`, and what it costs the budget. */
function capEvent(event: TimelineEvent): { chars: string[]; size: number } {
  // Code points, not UTF-16 units, so a surrogate pair is never split.
  // Slice first so one huge event isn't expanded whole: a code point is at most 2 UTF-16 units, so this keeps at least MAX_EVENT_CHARS of them.
  let chars = [...event.text.slice(0, MAX_EVENT_CHARS * 2 + 1)];
  if (chars.length > MAX_EVENT_CHARS) chars = chars.slice(0, MAX_EVENT_CHARS);
  const size = JSON.stringify({ id: event.id, kind: event.kind, text: chars.join("") }).length + 1;
  return { chars, size };
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

/** A session title is cut to this many characters, then "…" is added. */
export const MAX_TITLE_CHARS = 80;

const LINE_BREAK = /\r?\n/;

/**
 * The session's length in whole minutes, from the top-level `timestamp` of each log line. Lines that aren't JSON
 * objects, or have no valid timestamp, are skipped.
 *
 * @param raw - The gunzipped session log (JSONL).
 * @returns Rounded minutes between the earliest and latest timestamp, or null with fewer than two valid ones.
 */
export function durationMinutes(raw: string): number | null {
  let first = Infinity;
  let last = -Infinity;
  let count = 0;
  for (const line of raw.split(LINE_BREAK)) {
    if (line.trim() === "") continue;
    let entry: unknown;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (typeof entry !== "object" || entry === null) continue;
    const stamp = (entry as Record<string, unknown>).timestamp;
    if (typeof stamp !== "string") continue;
    const time = Date.parse(stamp);
    if (Number.isNaN(time)) continue;
    first = Math.min(first, time);
    last = Math.max(last, time);
    count++;
  }
  return count < 2 ? null : Math.round((last - first) / 60_000);
}

/**
 * A session title from the first prompt that still has text after `cleanPromptTitle` removes its injected tags and
 * collapses its whitespace. The cleaned text is cut to `MAX_TITLE_CHARS` with "…" when longer. The parser has already
 * redacted the text.
 *
 * @param events - The parsed timeline.
 * @returns The title, or null when no prompt has any text left.
 */
export function sessionTitle(events: readonly TimelineEvent[]): string | null {
  for (const event of events) {
    if (event.kind !== "prompt") continue;
    const text = cleanPromptTitle(event.text);
    if (text === "") continue;
    // Clean first, then count and cut by code points, so an emoji at the limit is kept whole or dropped, never split.
    const chars = [...text];
    return chars.length > MAX_TITLE_CHARS ? `${chars.slice(0, MAX_TITLE_CHARS).join("")}…` : text;
  }
  return null;
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
