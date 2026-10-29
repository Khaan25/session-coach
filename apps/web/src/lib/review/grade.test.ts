import assert from "node:assert/strict";
import { test } from "node:test";

import { fakeGrade } from "../model/fake.ts";
import { answerRequestSchema, MAX_ANSWER, parseGrade } from "./grade.ts";

const cardId = "6f1c2c3e-8a4b-4c1d-9e2f-0a1b2c3d4e5f";

test("parseGrade accepts { score: 0|1|2, missing } and trims missing", () => {
  assert.deepEqual(parseGrade({ score: 2, missing: "" }), { score: 2, missing: "" });
  assert.deepEqual(parseGrade({ score: 1, missing: " the cache " }), {
    score: 1,
    missing: "the cache",
  });
  // Extra keys are dropped, never passed on.
  assert.deepEqual(parseGrade({ score: 0, missing: "all", modelAnswer: "x" }), {
    score: 0,
    missing: "all",
  });
});

test("parseGrade rejects anything else", () => {
  for (const bad of [
    null,
    "2",
    { score: 3, missing: "" },
    { score: "2", missing: "" },
    { score: 1.5, missing: "" },
    { score: 2 },
    { missing: "" },
    { score: 1, missing: "x".repeat(2001) },
  ])
    assert.equal(parseGrade(bad), null, JSON.stringify(bad));
});

test("answerRequestSchema trims the answer and bounds it to 1-4000 characters", () => {
  assert.deepEqual(answerRequestSchema.parse({ cardId, answer: "  because  " }), {
    cardId,
    answer: "because",
  });
  assert.equal(answerRequestSchema.safeParse({ cardId, answer: "   " }).success, false);
  assert.equal(
    answerRequestSchema.safeParse({ cardId, answer: "x".repeat(MAX_ANSWER + 1) }).success,
    false,
  );
  assert.equal(answerRequestSchema.safeParse({ cardId: "not-a-uuid", answer: "a" }).success, false);
  assert.equal(answerRequestSchema.safeParse({ answer: "a" }).success, false);
});

test("the fake grader scores by overlap with the model answer", () => {
  const model_answer = "Postgres generates the flags from evidence so writers cannot disagree";
  assert.equal(fakeGrade({ model_answer, answer: model_answer }).score, 2);
  assert.equal(fakeGrade({ model_answer, answer: "postgres generates flags" }).score, 1);
  assert.equal(fakeGrade({ model_answer, answer: "no idea" }).score, 0);
  assert.equal(fakeGrade({ model_answer, answer: model_answer }).missing, "");
  // Its output always passes the real schema.
  for (const answer of [model_answer, "postgres", "x"])
    assert.notEqual(parseGrade(fakeGrade({ model_answer, answer })), null);
});
