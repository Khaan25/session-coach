import assert from "node:assert/strict";
import { test } from "node:test";

import { clockOffset, formatClock, secondsLeft } from "./clock.ts";

const serverNow = "2026-11-05T10:00:00.000Z";
const dueAt = "2026-11-05T10:03:00.000Z";

test("the offset corrects a browser clock that runs behind or ahead", () => {
  const behind = Date.parse(serverNow) - 30_000;
  assert.equal(clockOffset(serverNow, behind), 30_000);
  // 30 s behind: right after the response, all 180 s are still left, not 210.
  assert.equal(secondsLeft(dueAt, clockOffset(serverNow, behind), behind), 180);
  const ahead = Date.parse(serverNow) + 45_000;
  assert.equal(secondsLeft(dueAt, clockOffset(serverNow, ahead), ahead), 180);
});

test("seconds left round up and stop at 0", () => {
  const start = Date.parse(serverNow);
  assert.equal(secondsLeft(dueAt, 0, start + 179_001), 1);
  assert.equal(secondsLeft(dueAt, 0, start + 180_000), 0);
  assert.equal(secondsLeft(dueAt, 0, start + 400_000), 0);
});

test("the clock reads m:ss", () => {
  assert.equal(formatClock(180), "3:00");
  assert.equal(formatClock(65), "1:05");
  assert.equal(formatClock(0), "0:00");
});
