import assert from "node:assert/strict";
import { test } from "node:test";
import { niceScale } from "./chart-scale.ts";

test("niceScale covers the extent with nice steps", () => {
  assert.deepEqual(niceScale(0, 9), { min: 0, max: 10, ticks: [0, 2.5, 5, 7.5, 10] });
});

test("niceScale ends when the step is below the float ulp at lo", () => {
  const { ticks } = niceScale(1e16, 1e16 + 4);
  assert.ok(ticks.length > 0 && ticks.length <= 1001);
});
