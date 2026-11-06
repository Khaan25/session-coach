import assert from "node:assert/strict";
import { test } from "node:test";
import { reasoningEffort, reasoningField } from "./reasoning.ts";

test("the effort is read from MODEL_<TASK>_REASONING", () => {
  const env = { MODEL_EXTRACT_REASONING: "low", MODEL_GRADE_REASONING: "High " };
  assert.equal(reasoningEffort("MODEL_EXTRACT", env), "low");
  assert.equal(reasoningEffort("MODEL_GRADE", env), "high");
  assert.equal(reasoningEffort("MODEL_GRADE", { MODEL_EXTRACT_REASONING: "low" }), undefined);
});

test("unset, empty or invalid values are ignored", () => {
  assert.equal(reasoningEffort("MODEL_GRADE", {}), undefined);
  assert.equal(reasoningEffort("MODEL_GRADE", { MODEL_GRADE_REASONING: "" }), undefined);
  assert.equal(reasoningEffort("MODEL_GRADE", { MODEL_GRADE_REASONING: "extreme" }), undefined);
});

test("groq with an effort adds reasoning_effort", () => {
  assert.deepEqual(reasoningField("groq", "medium"), { reasoning_effort: "medium" });
});

test("no effort, or another provider, adds nothing", () => {
  assert.deepEqual(reasoningField("groq", undefined), {});
  assert.deepEqual(reasoningField("openrouter", "high"), {});
});
