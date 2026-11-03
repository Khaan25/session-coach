import assert from "node:assert/strict";
import { test } from "node:test";
import { grade } from "./prototype-grade.ts";

const ideas = [
  { words: ["office", "shared"], missing: "A shared IP." },
  { words: ["token"], missing: "The token is one learner." },
];

test("grade gives one point per key idea found, case-insensitive", () => {
  assert.deepEqual(grade(ideas, "A SHARED office ip blocks everyone; the token is per person"), {
    score: 2,
    missing: null,
  });
  assert.deepEqual(grade(ideas, "the token"), { score: 1, missing: "A shared IP." });
  assert.deepEqual(grade(ideas, "no idea"), { score: 0, missing: "A shared IP." });
});
