import assert from "node:assert/strict";
import { test } from "node:test";

import { localDate } from "../sessions/rows.ts";
import { addDays, nextReview } from "./schedule.ts";

const today = "2026-10-29";

test("score 2 walks the card through day 1, 3 and 7 to mastered", () => {
  assert.deepEqual(nextReview(0, 2, today), { step: 1, due_on: "2026-10-30", mastered: false });
  assert.deepEqual(nextReview(1, 2, today), { step: 2, due_on: "2026-11-01", mastered: false });
  assert.deepEqual(nextReview(2, 2, today), { step: 3, due_on: "2026-11-05", mastered: false });
  assert.deepEqual(nextReview(3, 2, today), { step: 3, due_on: null, mastered: true });
});

test("score 0 or 1 restarts at day 1 from any step", () => {
  for (const step of [0, 1, 2, 3] as const)
    for (const score of [0, 1] as const)
      assert.deepEqual(nextReview(step, score, today), {
        step: 1,
        due_on: "2026-10-30",
        mastered: false,
      });
});

test("addDays crosses month, year and leap day", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-03-28", 7), "2026-04-04");
});

test("the due date follows the learner's local midnight, not UTC", () => {
  // 23:30 UTC on Oct 29 is already Oct 30 in Karachi (UTC+5) and still Oct 29 in New York.
  const now = new Date("2026-10-29T23:30:00Z");
  assert.equal(nextReview(0, 2, localDate("Asia/Karachi", now)).due_on, "2026-10-31");
  assert.equal(nextReview(0, 2, localDate("America/New_York", now)).due_on, "2026-10-30");
  // One minute before local midnight in Karachi is still the 29th there.
  assert.equal(localDate("Asia/Karachi", new Date("2026-10-29T18:59:00Z")), "2026-10-29");
});
