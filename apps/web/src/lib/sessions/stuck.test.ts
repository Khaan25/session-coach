import assert from "node:assert/strict";
import { test } from "node:test";

import { isStuck, STUCK_MS } from "./stuck.ts";

const now = new Date("2026-11-03T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

test("isStuck: processing past STUCK_MS is stuck", () => {
  assert.equal(
    isStuck({ status: "processing", processing_started_at: ago(STUCK_MS + 1) }, now),
    true,
  );
});

test("isStuck: a live run, another status or no start time is not stuck", () => {
  assert.equal(isStuck({ status: "processing", processing_started_at: ago(STUCK_MS) }, now), false);
  assert.equal(isStuck({ status: "failed", processing_started_at: ago(STUCK_MS * 2) }, now), false);
  assert.equal(isStuck({ status: "processing", processing_started_at: null }, now), false);
});
