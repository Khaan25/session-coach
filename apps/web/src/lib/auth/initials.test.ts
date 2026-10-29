import assert from "node:assert/strict";
import { test } from "node:test";

import { initialsOf } from "./initials.ts";

test("initialsOf uses first and last name, then the email, then ?", () => {
  assert.equal(initialsOf("Sample Learner", "x@y.z"), "SL");
  assert.equal(initialsOf("Ada Byron Lovelace", null), "AL");
  assert.equal(initialsOf(null, "zia.khan@example.com"), "ZK");
  assert.equal(initialsOf("", ""), "?");
});
