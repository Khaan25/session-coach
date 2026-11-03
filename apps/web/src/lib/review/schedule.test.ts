import assert from "node:assert/strict";
import { test } from "node:test";

import { localDate } from "../sessions/rows.ts";
import { addDays, dueInWords, nextReview } from "./schedule.ts";

const today = "2026-10-29";

test("score 2 walks the card through day 1, 3 and 7 to mastered", () => {
  assert.deepEqual(nextReview(0, 2, today), { step: 1, due_on: "2026-10-30", mastered: false });
  assert.deepEqual(nextReview(1, 2, today), { step: 2, due_on: "2026-11-01", mastered: false });
  assert.deepEqual(nextReview(2, 2, today), { step: 3, due_on: "2026-11-05", mastered: false });
  assert.deepEqual(nextReview(3, 2, today), { step: 3, due_on: null, mastered: true });
});

test("score 0 or 1 moves the card one step down, never below 1, due tomorrow", () => {
  const expected = { 0: 1, 1: 1, 2: 1, 3: 2 } as const;
  for (const step of [0, 1, 2, 3] as const)
    for (const score of [0, 1] as const)
      assert.deepEqual(nextReview(step, score, today), {
        step: expected[step],
        due_on: "2026-10-30",
        mastered: false,
      });
});

test("a perfect run from Tue 2026-11-03 is due 4, 7 and 14 Nov, then mastered", () => {
  let day = "2026-11-03";
  let state = nextReview(0, 2, day);
  assert.deepEqual(state, { step: 1, due_on: "2026-11-04", mastered: false });
  day = state.due_on!;
  state = nextReview(state.step, 2, day);
  assert.deepEqual(state, { step: 2, due_on: "2026-11-07", mastered: false });
  day = state.due_on!;
  state = nextReview(state.step, 2, day);
  assert.deepEqual(state, { step: 3, due_on: "2026-11-14", mastered: false });
  day = state.due_on!;
  state = nextReview(state.step, 2, day);
  assert.deepEqual(state, { step: 3, due_on: null, mastered: true });
});

test("a slip on the last review keeps the progress: back one step, then on to day 7", () => {
  const slipped = nextReview(3, 1, "2026-11-14");
  assert.deepEqual(slipped, { step: 2, due_on: "2026-11-15", mastered: false });
  assert.deepEqual(nextReview(slipped.step, 2, "2026-11-15"), {
    step: 3,
    due_on: "2026-11-22",
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

test("dueInWords says tomorrow, then the weekday and date", () => {
  assert.equal(dueInWords("2026-11-03", "2026-11-02"), "tomorrow");
  assert.equal(dueInWords("2026-11-05", "2026-11-02"), "on Thursday 5 November");
  assert.equal(dueInWords("2027-01-01", "2026-12-31"), "tomorrow");
});
