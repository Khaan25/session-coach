import assert from "node:assert/strict";
import { test } from "node:test";

import { computeOwnership, type OwnershipInput } from "./ownership.ts";

const base: OwnershipInput = {
  cards: [
    { id: "a", session_id: "s1" },
    { id: "b", session_id: "s1" },
    { id: "c", session_id: "s2" },
    { id: "d", session_id: "s3" },
  ],
  sessions: [
    { id: "s1", repo: "session-coach" },
    { id: "s2", repo: "rapporteur" },
    { id: "s3", repo: null },
    { id: "s4", repo: "no-cards" },
  ],
  reviews: [
    { card_id: "a", step: 3, mastered: true },
    { card_id: "b", step: 1, mastered: false },
    { card_id: "hidden", step: 3, mastered: true }, // not a visible card: ignored
  ],
  explainedIds: ["a", "a", "b", "d", "hidden"], // "a" answered 2 twice: counted once
};

test("overall: explained once per card, owned from mastered reviews, total visible cards", () => {
  assert.deepEqual(computeOwnership(base).overall, { explained: 3, owned: 1, total: 4 });
});

test("per repo, A to Z, sessions with no repo last, repos with no cards left out", () => {
  assert.deepEqual(computeOwnership(base).repos, [
    { repo: "rapporteur", explained: 0, owned: 0, total: 1 },
    { repo: "session-coach", explained: 2, owned: 1, total: 2 },
    { repo: null, explained: 1, owned: 0, total: 1 },
  ]);
});

test("no cards: zero overall and no repos", () => {
  assert.deepEqual(computeOwnership({ ...base, cards: [] }), {
    overall: { explained: 0, owned: 0, total: 0 },
    repos: [],
  });
});
