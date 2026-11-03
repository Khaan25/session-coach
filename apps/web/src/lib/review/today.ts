// Today's review queue: the one rule the /review queue, the dashboard's due count, the daily email and the answer
// route's cap all use, so they can't disagree. Pure, so node --test runs it.

import { localDate } from "../sessions/rows.ts";
import { newCardsSince } from "./schedule.ts";

/** At most this many cards a local day, answers and skips together: a habit people keep, not a backlog to clear. */
export const DAILY_CAP = 5;

/** Up to this many of the day's cards go to new cards first, so new cards never starve behind due ones. */
export const NEW_SLOTS = 2;

/** What the answer route says when the day's cards are done. */
export const DAILY_CAP_MESSAGE = `You've done ${DAILY_CAP} cards today. This one comes back tomorrow.`;

/**
 * The earliest answer time that can fall on the learner's today, whatever their time zone: a local day is at most 25
 * hours long (a DST change), so 26 hours back always covers it. Read answers since this, then `countAnsweredToday`.
 */
export function answeredSince(now: Date): string {
  return new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString();
}

/**
 * How many answers (skips included) fall on `today` in the learner's time zone.
 *
 * @param answeredAt - `answers.created_at` timestamps, at least those since `answeredSince(now)`.
 * @param timeZone - The learner's `profiles.timezone`.
 * @param today - The learner's local date, YYYY-MM-DD (`localDate(timeZone, now)`).
 */
export function countAnsweredToday(
  answeredAt: readonly string[],
  timeZone: string,
  today: string,
): number {
  return answeredAt.filter((at) => localDate(timeZone, new Date(at)) === today).length;
}

/**
 * Today's cards: at most `DAILY_CAP` minus what was answered today (never below 0). Up to `NEW_SLOTS` go to new cards
 * (never answered, from the last `NEW_CARD_DAYS` days, newest first); due cards fill the rest, oldest due first; new
 * cards fill any slot the due cards leave empty.
 *
 * @param due - Cards due today (not mastered, `due_on` on or before today), visible only.
 * @param fresh - Visible cards with no `reviews` row. Older than the new-card window are left out here.
 * @param answeredToday - From `countAnsweredToday`.
 * @param now - The current time, for the new-card window.
 * @returns The due cards first, then the new ones, each in queue order.
 */
export function todayQueue<D extends { dueOn: string | null }, N extends { createdAt: string }>({
  due,
  fresh,
  answeredToday,
  now,
}: {
  due: readonly D[];
  fresh: readonly N[];
  answeredToday: number;
  now: Date;
}): { due: D[]; fresh: N[] } {
  const left = Math.max(0, DAILY_CAP - answeredToday);
  const since = Date.parse(newCardsSince(now));
  // toSorted is stable: cards of one session keep the caller's order (position).
  const newest = fresh
    .filter((card) => Date.parse(card.createdAt) >= since)
    .toSorted((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const oldestDue = due.toSorted((a, b) => (a.dueOn ?? "").localeCompare(b.dueOn ?? ""));
  const reserved = Math.min(NEW_SLOTS, newest.length, left);
  const dueToday = oldestDue.slice(0, left - reserved);
  return { due: dueToday, fresh: newest.slice(0, left - dueToday.length) };
}
