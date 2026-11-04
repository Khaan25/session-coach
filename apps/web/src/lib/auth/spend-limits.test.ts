import assert from "node:assert/strict";
import { test } from "node:test";

import { refusesUnlimited } from "./spend-limits.ts";

test("production refuses model-spend calls when no limiter is configured", () => {
  assert.equal(refusesUnlimited("grade", "production"), true);
  assert.equal(refusesUnlimited("process", "production"), true);
});

test("other budgets and other environments stay open without a limiter", () => {
  assert.equal(refusesUnlimited("push", "production"), false);
  assert.equal(refusesUnlimited("tokenCreate", "production"), false);
  assert.equal(refusesUnlimited("grade", "preview"), false);
  assert.equal(refusesUnlimited("grade", undefined), false);
});
