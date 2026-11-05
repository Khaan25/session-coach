import assert from "node:assert/strict";
import { test } from "node:test";

import { outcomeInWords, outcomesAt, stageIndex } from "./ladder.ts";

const words = (step: 0 | 1 | 2 | 3) => {
  const o = outcomesAt(step);
  return {
    pass: outcomeInWords(step, o.pass),
    miss: outcomeInWords(step, o.miss),
    skip: outcomeInWords(step, o.skip),
  };
};

test("a new card goes to day 1 whatever the answer", () => {
  assert.deepEqual(words(0), {
    pass: "Goes to Day 1, back tomorrow.",
    miss: "Goes to Day 1, back tomorrow.",
    skip: "Goes to Day 1, back tomorrow.",
  });
});

test("a 2 moves to the next gap: 3 days, then 7", () => {
  assert.equal(words(1).pass, "Moves up to Day 4, back in 3 days.");
  assert.equal(words(2).pass, "Moves up to Day 11, back in 7 days.");
});

test("a 2 on day 11 owns the card", () => {
  assert.deepEqual(outcomesAt(3).pass, { level: "owned", inDays: null });
  assert.equal(words(3).pass, "You own it. It doesn't come back.");
});

test("a miss drops one step, never below day 1, back tomorrow", () => {
  assert.equal(words(1).miss, "Stays at Day 1, back tomorrow.");
  assert.equal(words(2).miss, "Drops to Day 1, back tomorrow.");
  assert.equal(words(3).miss, "Drops to Day 4, back tomorrow.");
});

test("a skip keeps the step and comes back tomorrow", () => {
  assert.equal(words(2).skip, "Stays at Day 4, back tomorrow.");
  assert.equal(words(3).skip, "Stays at Day 11, back tomorrow.");
});

test("owned is the last rung", () => {
  assert.equal(stageIndex("owned"), 4);
  assert.equal(stageIndex(2), 2);
});
