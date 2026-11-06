import assert from "node:assert/strict";
import { test } from "node:test";

import { isStuck, STUCK_MS } from "./stuck.ts";

const now = new Date("2026-11-03T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
const old = ago(STUCK_MS * 2);

test("isStuck: processing past STUCK_MS is stuck", () => {
  assert.equal(
    isStuck(
      { status: "processing", processing_started_at: ago(STUCK_MS + 1), created_at: old },
      now,
    ),
    true,
  );
});

test("isStuck: pending past STUCK_MS since it was registered is stuck", () => {
  assert.equal(
    isStuck({ status: "pending", processing_started_at: null, created_at: ago(STUCK_MS + 1) }, now),
    true,
  );
  assert.equal(
    isStuck({ status: "pending", processing_started_at: null, created_at: ago(STUCK_MS) }, now),
    false,
  );
});

test("isStuck: a pending repeat counts from its latest upload URL, not from registration", () => {
  assert.equal(
    isStuck({ status: "pending", processing_started_at: ago(STUCK_MS), created_at: old }, now),
    false,
  );
  assert.equal(
    isStuck({ status: "pending", processing_started_at: ago(STUCK_MS + 1), created_at: old }, now),
    true,
  );
});

test("isStuck: a live run, another status or no start time is not stuck", () => {
  assert.equal(
    isStuck({ status: "processing", processing_started_at: ago(STUCK_MS), created_at: old }, now),
    false,
  );
  assert.equal(
    isStuck({ status: "failed", processing_started_at: old, created_at: old }, now),
    false,
  );
  assert.equal(
    isStuck({ status: "ready", processing_started_at: old, created_at: old }, now),
    false,
  );
  assert.equal(
    isStuck({ status: "processing", processing_started_at: null, created_at: old }, now),
    false,
  );
});
