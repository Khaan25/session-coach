import assert from "node:assert/strict";
import { test } from "node:test";

import {
  listUnsubscribeHeaders,
  unsubscribeToken,
  unsubscribeTokenValid,
  unsubscribeUrl,
} from "./unsubscribe.ts";

const id = "6f1c3c1e-6a43-4c8e-9a51-2a7e3f1b9d10";
const other = "0b7d2f4a-1c2e-4f3a-8b9c-0d1e2f3a4b5c";

test("a link's token checks out for its own learner only", () => {
  const url = new URL(unsubscribeUrl("https://coach.example.test", id, "s3cret"));
  assert.equal(url.pathname, "/api/unsubscribe");
  assert.equal(url.searchParams.get("u"), id);
  const token = url.searchParams.get("t") ?? "";
  assert.match(token, /^[\w-]{43}$/);
  assert.equal(unsubscribeTokenValid(id, token, "s3cret"), true);
  assert.equal(unsubscribeTokenValid(other, token, "s3cret"), false);
  assert.equal(unsubscribeTokenValid(id, token, "rotated"), false);
  assert.equal(unsubscribeTokenValid(id, `${token}x`, "s3cret"), false);
});

test("an unset secret lets nobody unsubscribe", () => {
  const token = unsubscribeToken(id, "");
  assert.equal(unsubscribeTokenValid(id, token, ""), false);
  assert.equal(unsubscribeTokenValid(id, token, undefined), false);
});

test("the headers follow RFC 8058", () => {
  assert.deepEqual(listUnsubscribeHeaders("https://x.test/api/unsubscribe?u=a&t=b"), {
    "List-Unsubscribe": "<https://x.test/api/unsubscribe?u=a&t=b>",
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  });
});
