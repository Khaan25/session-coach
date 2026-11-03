import assert from "node:assert/strict";
import { test } from "node:test";

import { countOwned, levelOf } from "./level.ts";

test("no reviews row is level 0", () => {
  assert.equal(levelOf(null), 0);
  assert.equal(levelOf(undefined), 0);
});

test("a pending card's level is its step", () => {
  for (const step of [0, 1, 2, 3] as const) assert.equal(levelOf({ step, mastered: false }), step);
});

test("a mastered card is owned, whatever its step", () => {
  assert.equal(levelOf({ step: 3, mastered: true }), "owned");
  assert.equal(levelOf({ step: 1, mastered: true }), "owned");
});

test("countOwned counts owned cards out of the list", () => {
  assert.deepEqual(countOwned([]), { owned: 0, total: 0 });
  assert.deepEqual(
    countOwned([
      { step: 3, mastered: true },
      { step: 2, mastered: false },
      null,
      { step: 3, mastered: true },
      undefined,
    ]),
    { owned: 2, total: 5 },
  );
});
