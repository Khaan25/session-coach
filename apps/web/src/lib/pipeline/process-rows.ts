import { decisionSourceSchema, evidenceSchema } from "@session-coach/shared/decision";
import { z } from "zod";
import type { CheckedCard } from "./evidence.ts";
import type { TimelineEvent } from "./parser.ts";

// Pure helpers for processSession, kept apart from process.ts so node --test can load them (process.ts imports
// `server-only` and the `@/` alias).

/**
 * The most event text we send the model, in characters. About 4 characters per token puts this near 4,000 tokens, which
 * leaves room for the instructions and the retry inside Groq's 8,000 tokens per minute.
 */
export const MAX_TIMELINE_CHARS = 16_000;

/** One event's text is cut to this many characters (the start is kept) so a single huge event can't eat the budget. */
export const MAX_EVENT_CHARS = 1_500;

/**
 * Caps each event's text, then keeps events in order until the budget is spent. An event that doesn't fit ends the
 * timeline, so ids stay E1..En with no gaps and `event_index` still points at the right event.
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
    if (used + text.length > MAX_TIMELINE_CHARS) break;
    used += text.length;
    kept.push({ ...event, text });
  }
  return { kept, cut: events.length - kept.length };
}

/** A session title is cut to this many characters, then "…" is added. */
export const MAX_TITLE_CHARS = 80;

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
  for (const line of raw.split(/\r?\n/)) {
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
 * A session title from the first prompt: whitespace collapsed, cut to `MAX_TITLE_CHARS` with "…" when longer. The
 * parser has already redacted the text.
 *
 * @param events - The parsed timeline.
 * @returns The title, or null when there is no prompt or it is blank.
 */
export function sessionTitle(events: readonly TimelineEvent[]): string | null {
  const prompt = events.find((e) => e.kind === "prompt");
  if (!prompt) return null;
  const text = prompt.text.replace(/\s+/g, " ").trim();
  if (text === "") return null;
  // Count and cut by code points, so an emoji at the limit is kept whole or dropped, never split in two.
  const chars = [...text];
  return chars.length > MAX_TITLE_CHARS ? `${chars.slice(0, MAX_TITLE_CHARS).join("")}…` : text;
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
