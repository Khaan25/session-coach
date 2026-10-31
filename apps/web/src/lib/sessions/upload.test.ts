import assert from "node:assert/strict";
import { test } from "node:test";

import { bearerToken, MAX_UPLOAD_BYTES, rawPathFor, uploadRequestSchema } from "./upload.ts";

const minimal = { external_id: "2f6c1e1a-0b7e-4c1a-9f3e-8d2b6a1c0e55", size_bytes: 1024 };

test("a minimal body is valid and defaults the agent", () => {
  const parsed = uploadRequestSchema.parse(minimal);
  assert.equal(parsed.agent, "claude-code");
  assert.equal(parsed.title, undefined);
});

test("nullable metadata accepts null", () => {
  const parsed = uploadRequestSchema.safeParse({
    ...minimal,
    title: null,
    repo: null,
    branch: null,
    started_at: null,
    duration_min: null,
    event_count: null,
  });
  assert.equal(parsed.success, true);
});

test("an external_id that could escape the Storage folder is refused", () => {
  for (const external_id of ["../other-user/x", "a/b", "", "a b", "x".repeat(129)]) {
    assert.equal(
      uploadRequestSchema.safeParse({ ...minimal, external_id }).success,
      false,
      external_id,
    );
  }
});

test("size_bytes must be a positive integer; the route checks the limit", () => {
  assert.equal(uploadRequestSchema.safeParse({ ...minimal, size_bytes: 0 }).success, false);
  assert.equal(uploadRequestSchema.safeParse({ ...minimal, size_bytes: 1.5 }).success, false);
  assert.equal(
    uploadRequestSchema.safeParse({ ...minimal, size_bytes: MAX_UPLOAD_BYTES + 1 }).success,
    true,
  );
});

test("started_at needs a full ISO timestamp", () => {
  assert.equal(
    uploadRequestSchema.safeParse({ ...minimal, started_at: "2026-10-31" }).success,
    false,
  );
  assert.equal(
    uploadRequestSchema.safeParse({ ...minimal, started_at: "2026-10-31T09:12:00Z" }).success,
    true,
  );
});

test("rawPathFor puts the log under the owner's folder", () => {
  assert.equal(rawPathFor("u1", "s1"), "u1/s1.jsonl.gz");
});

test("bearerToken reads only a bearer header", () => {
  assert.equal(bearerToken("Bearer sc_abc"), "sc_abc");
  assert.equal(bearerToken("bearer   sc_abc"), "sc_abc");
  assert.equal(bearerToken(null), null);
  assert.equal(bearerToken("Basic sc_abc"), null);
  assert.equal(bearerToken("Bearer "), null);
  assert.equal(bearerToken("Bearer a b"), null);
});
