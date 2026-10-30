import assert from "node:assert/strict";
import { test } from "node:test";
import { formatRelativeTime } from "./relative-time.ts";

const now = new Date("2026-10-29T12:00:00Z");

test("picks the largest whole unit, past and future", () => {
  assert.equal(formatRelativeTime("2026-10-29T11:59:30Z", now), "now");
  assert.equal(formatRelativeTime("2026-10-29T11:55:00Z", now), "5 minutes ago");
  assert.equal(formatRelativeTime("2026-10-29T09:00:00Z", now), "3 hours ago");
  assert.equal(formatRelativeTime("2026-10-28T12:00:00Z", now), "yesterday");
  assert.equal(formatRelativeTime("2026-10-27T16:40:00+05:45", now), "2 days ago");
  assert.equal(formatRelativeTime("2026-11-01T12:00:00Z", now), "in 3 days");
});

test("rounds past and future alike, and never reaches the next unit's count", () => {
  assert.equal(formatRelativeTime("2026-10-29T11:58:30Z", now), "2 minutes ago");
  assert.equal(formatRelativeTime("2026-10-29T12:01:30Z", now), "in 2 minutes");
  assert.equal(formatRelativeTime("2026-10-29T11:00:20Z", now), "1 hour ago");
  assert.equal(formatRelativeTime("2026-10-28T12:20:00Z", now), "yesterday");
});

test("returns null for an unparseable date", () => {
  assert.equal(formatRelativeTime("not a date", now), null);
});
