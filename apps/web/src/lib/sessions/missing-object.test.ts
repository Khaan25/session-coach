import assert from "node:assert/strict";
import { test } from "node:test";

import { isMissingObject } from "./missing-object.ts";

test("a missing object is not found, however Storage spells it", () => {
  assert.equal(isMissingObject({ status: 400, statusCode: "404" }), true);
  assert.equal(isMissingObject({ status: 404 }), true);
  assert.equal(isMissingObject({ status: 400, code: "NoSuchKey" }), true);
  assert.equal(isMissingObject({ status: 400, code: "not_found" }), true);
});

test("a Storage failure is not a missing object", () => {
  assert.equal(isMissingObject({ status: 500, statusCode: "500" }), false);
  assert.equal(isMissingObject({ status: 503 }), false);
  assert.equal(isMissingObject({ status: 400, statusCode: "403", code: "AccessDenied" }), false);
  assert.equal(isMissingObject({}), false);
});
