import assert from "node:assert/strict";
import { test } from "node:test";

import { computeOwnership, type OwnershipRow } from "./ownership.ts";

// `learner_ownership()`'s rows, in the order Postgres happened to return them.
const rows: OwnershipRow[] = [
  { repo: null, explained: 1, owned: 0, total: 1 },
  { repo: "session-coach", explained: 2, owned: 1, total: 2 },
  { repo: "rapporteur", explained: 0, owned: 0, total: 1 },
];

test("overall sums every repo's counts", () => {
  assert.deepEqual(computeOwnership(rows).overall, { explained: 3, owned: 1, total: 4 });
});

test("repos A to Z, sessions with no repo last", () => {
  assert.deepEqual(
    computeOwnership(rows).repos.map(({ repo }) => repo),
    ["rapporteur", "session-coach", null],
  );
});

test("no cards: zero overall and no repos", () => {
  assert.deepEqual(computeOwnership([]), {
    overall: { explained: 0, owned: 0, total: 0 },
    repos: [],
  });
});
