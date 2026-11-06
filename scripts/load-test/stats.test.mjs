import assert from "node:assert/strict";
import { test } from "node:test";

import { benjaminiHochberg, mannWhitney, median, medianCI, quantile, speedupCI } from "./stats.mjs";

test("quantile interpolates and median takes the middle", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(quantile([0, 10], 0.95), 9.5);
});

test("Mann-Whitney matches the hand computation", () => {
  // Only 2.3 > 2.2 among the 36 pairs, so U = 1. Normal approximation: mean 18, sd sqrt(39), z = (17 - 0.5) / 6.245,
  // two-sided p = 0.0082.
  const a = [1.1, 2.3, 1.8, 2.0, 1.5, 1.7];
  const b = [2.9, 3.1, 2.2, 3.6, 2.8, 3.3];
  const { u, p } = mannWhitney(a, b);
  assert.equal(u, 1);
  assert.ok(Math.abs(p - 0.0082) < 0.0002, `p = ${p}`);
});

test("Mann-Whitney finds no difference between identical samples", () => {
  assert.equal(mannWhitney([5, 5, 5], [5, 5, 5]).p, 1);
  assert.ok(mannWhitney([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]).p > 0.9);
});

test("bootstrap intervals bracket the point estimate and are reproducible", () => {
  const xs = Array.from({ length: 50 }, (_, i) => 10 + (i % 7));
  const [lo, hi] = medianCI(xs);
  assert.ok(lo <= median(xs) && median(xs) <= hi);
  assert.deepEqual(medianCI(xs), medianCI(xs));
  const [slo, shi] = speedupCI(
    xs.map((x) => x * 10),
    xs,
  );
  assert.ok(slo <= 10 && 10 <= shi);
});

test("Benjamini-Hochberg matches the textbook step-up", () => {
  // sorted p 0.01, 0.02, 0.03, 0.5 with m = 4: 0.04, 0.04, 0.04, 0.5
  assert.deepEqual(
    benjaminiHochberg([0.03, 0.5, 0.01, 0.02]).map((q) => +q.toFixed(4)),
    [0.04, 0.5, 0.04, 0.04],
  );
});
