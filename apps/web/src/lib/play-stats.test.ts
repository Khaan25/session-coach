import assert from "node:assert/strict";
import { test } from "node:test";
import { buildRetentionCohorts, countNewUsers } from "./play-stats.ts";

const now = new Date("2026-10-29T12:00:00Z");

test("counts users created within the window", () => {
  const created = ["2026-10-28T00:00:00Z", "2026-10-20T00:00:00Z", "2026-09-01T00:00:00Z"];
  assert.equal(countNewUsers(created, now, 7), 1);
  assert.equal(countNewUsers(created, now, 30), 2);
});

test("retention counts exact-day returns and omits immature windows", () => {
  const profiles = [
    { id: "a", created_at: "2026-10-21T09:00:00Z" },
    { id: "b", created_at: "2026-10-21T23:00:00Z" },
    { id: "c", created_at: "2026-10-28T10:00:00Z" },
  ];
  const activity = [
    { user_id: "a", created_at: "2026-10-22T01:00:00Z" }, // day 1
    { user_id: "a", created_at: "2026-10-22T05:00:00Z" }, // same day, counted once
    { user_id: "b", created_at: "2026-10-28T00:30:00Z" }, // day 7
    { user_id: "b", created_at: "2026-10-24T00:00:00Z" }, // day 3, not a window
    { user_id: "zz", created_at: "2026-10-22T00:00:00Z" }, // unknown user, ignored
  ];
  assert.deepEqual(buildRetentionCohorts(profiles, activity, now), [
    { date: "2026-10-21", signups: 2, d1: 1, d7: 1 },
    { date: "2026-10-28", signups: 1, d1: 0 },
  ]);
});
