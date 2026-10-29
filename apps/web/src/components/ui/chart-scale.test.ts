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

test("niceScale keeps ticks distinct on a large base", () => {
  const { ticks } = niceScale(1e13, 1e13 + 4);
  assert.equal(new Set(ticks).size, ticks.length);
  assert.deepEqual(ticks, [1e13, 1e13 + 1, 1e13 + 2, 1e13 + 3, 1e13 + 4]);
});

test("niceScale caps a huge count before picking the step", () => {
  const { ticks } = niceScale(0, 10, 1e6);
  assert.equal(ticks.at(-1), 10);
});
