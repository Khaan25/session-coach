import assert from "node:assert/strict";
import { test } from "node:test";

import { computeProgress, type ProgressInput } from "./progress.ts";

const now = new Date("2026-10-29T12:00:00Z");

const base: ProgressInput = {
  cards: [
    { id: "a", session_id: "s1" },
    { id: "b", session_id: "s1" },
    { id: "c", session_id: "s1" },
    { id: "d", session_id: "s2" },
    { id: "e", session_id: "s2" },
  ],
  reviews: [
    { card_id: "a", step: 3, mastered: true },
    { card_id: "b", step: 1, mastered: false },
    { card_id: "c", step: 2, mastered: false },
    { card_id: "d", step: 3, mastered: false },
    { card_id: "hidden", step: 3, mastered: true }, // not a visible card: ignored
  ],
  answers: [
    { card_id: "a", score: 2, created_at: "2026-10-28T10:00:00Z" }, // mastered and scored 2: counted once
    { card_id: "c", score: 2, created_at: "2026-10-25T10:00:00Z" }, // scored 2 this week
    { card_id: "d", score: 2, created_at: "2026-10-20T10:00:00Z" }, // scored 2, but 9 days ago
    { card_id: "b", score: 1, created_at: "2026-10-29T08:00:00Z" },
    { card_id: "b", score: 0, created_at: "2026-09-01T08:00:00Z" }, // outside the 30 days
    { card_id: "hidden", score: 2, created_at: "2026-10-29T08:00:00Z" }, // ignored
  ],
  sessions: [
    { id: "s1", title: "Add RLS", repo: null, branch: null },
    { id: "s2", title: null, repo: "coach", branch: "main" },
    { id: "s3", title: "No cards", repo: null, branch: null },
  ],
  timeZone: "UTC",
  now,
};

test("headline: mastered cards plus cards scored 2 in the last 7 days, each once", () => {
  const p = computeProgress(base);
  assert.equal(p.canStillExplain, 2); // a (mastered, also scored 2) and c
  assert.equal(p.totalCards, 5);
});

test("steps: no review is new, mastered wins, step 1-3 is day 1/3/7", () => {
  assert.deepEqual(computeProgress(base).steps, {
    new: 1,
    "day-1": 1,
    "day-3": 1,
    "day-7": 1,
    mastered: 1,
  });
});

test("answers per day: 30 days ending today, and the score mix over them", () => {
  const p = computeProgress(base);
  assert.equal(p.answersPerDay.length, 30);
  assert.deepEqual(p.answersPerDay.at(-1), { day: "Oct 29", answers: 1 });
  assert.deepEqual(p.answersPerDay[0], { day: "Sep 30", answers: 0 });
  assert.equal(p.answersPerDay.find(({ day }) => day === "Oct 28")?.answers, 1);
  assert.deepEqual(p.scoreMix, { 0: 0, 1: 1, 2: 3 });
});

test("days are the learner's days", () => {
  // 01:00 UTC on Oct 29 is still Oct 28 in Los Angeles.
  const p = computeProgress({
    ...base,
    answers: [{ card_id: "a", score: 2, created_at: "2026-10-29T01:00:00Z" }],
    timeZone: "America/Los_Angeles",
    now: new Date("2026-10-29T02:00:00Z"),
  });
  assert.deepEqual(p.answersPerDay.at(-1), { day: "Oct 28", answers: 1 });
});

test("by session: mastered of total, sessions without cards dropped, title fallback", () => {
  assert.deepEqual(computeProgress(base).bySession, [
    { id: "s1", title: "Add RLS", mastered: 1, total: 3 },
    { id: "s2", title: "coach on main", mastered: 0, total: 2 },
  ]);
});

test("no data: zeros everywhere", () => {
  const p = computeProgress({ ...base, cards: [], reviews: [], answers: [], sessions: [] });
  assert.equal(p.canStillExplain, 0);
  assert.equal(p.totalCards, 0);
  assert.ok(p.answersPerDay.every(({ answers }) => answers === 0));
  assert.deepEqual(p.bySession, []);
});
