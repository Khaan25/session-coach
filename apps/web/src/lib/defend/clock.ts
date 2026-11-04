// Defend it's countdown in the browser. Pure, so node --test runs it. The deadline is the server's: the browser only
// measures how much of it is left, corrected by how far its own clock is from the server's.

/**
 * How far the browser's clock is from the server's, in ms: add it to `Date.now()` to read the server's time.
 *
 * @param serverNow - The `serverNow` a defend route returned.
 * @param receivedAt - `Date.now()` when that response arrived.
 */
export function clockOffset(serverNow: string, receivedAt: number): number {
  return new Date(serverNow).getTime() - receivedAt;
}

/**
 * Whole seconds left before `dueAt` by the server's clock, never below 0. Rounded up, so the timer shows 0:00 only
 * once the time is really gone.
 */
export function secondsLeft(dueAt: string, offset: number, now: number): number {
  return Math.max(0, Math.ceil((new Date(dueAt).getTime() - (now + offset)) / 1000));
}

/** `m:ss`, e.g. 2:05. */
export const formatClock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
