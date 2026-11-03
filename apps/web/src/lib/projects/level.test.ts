import assert from "node:assert/strict";
import { test } from "node:test";

import { questionLevelSchema } from "@session-coach/shared/project";

import { QUESTION_LEVEL_OPTIONS, levelOrDefault } from "./level.ts";

test("a stored level maps to itself; anything else is simple", () => {
  for (const level of questionLevelSchema.options) assert.equal(levelOrDefault(level), level);
  for (const value of [undefined, null, "", "medium", 2])
    assert.equal(levelOrDefault(value), "simple");
});

test("the picker offers every level once, in order, each with an example", () => {
  assert.deepEqual(
    QUESTION_LEVEL_OPTIONS.map((option) => option.value),
    questionLevelSchema.options,
  );
  assert.deepEqual(
    QUESTION_LEVEL_OPTIONS.map((option) => option.label),
    ["Simple", "Hard", "Complex"],
  );
  for (const option of QUESTION_LEVEL_OPTIONS) {
    assert.ok(option.example.split(" ").length >= 5, `${option.value} example is a real sentence`);
    assert.ok(option.example.endsWith("?"));
  }
});
