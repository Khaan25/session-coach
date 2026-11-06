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
    "day-4": 1,
    "day-11": 1,
    mastered: 1,
  });
});

test("answers per day: 30 days ending today, and the score mix over them", () => {
  const p = computeProgress(base);
  assert.equal(p.answersPerDay.length, 30);
  assert.deepEqual(p.answersPerDay.at(-1), { date: "2026-10-29", day: "Oct 29", answers: 1 });
  assert.deepEqual(p.answersPerDay[0], { date: "2026-09-30", day: "Sep 30", answers: 0 });
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
  assert.deepEqual(p.answersPerDay.at(-1), { date: "2026-10-28", day: "Oct 28", answers: 1 });
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

test("project progress isolates cards, answers, ownership and time-series activity", () => {
  const progress = computeProgress(base, "repo:coach");
  assert.equal(progress.totalCards, 2);
  assert.equal(progress.steps.mastered, 0);
  assert.equal(progress.explained, 1);
  assert.equal(progress.canStillExplain, 0);
  assert.equal(progress.bySession.length, 1);
  assert.deepEqual(progress.scoreMix, { 0: 0, 1: 0, 2: 1 });
  assert.equal(
    progress.byProject.find((project) => project.scope === "unassigned")?.steps.mastered,
    1,
  );
});
test("explained is lifetime recall, owned is mastery, and hidden decisions never inflate either", () => {
  const progress = computeProgress(
    { ...base, explainedCardIds: ["e", "e", "hidden", "missing"] },
    "repo:coach",
  );
  assert.equal(progress.explained, 2);
  assert.equal(progress.steps.mastered, 0);
  assert.equal(progress.totalCards, 2);
});
test("unknown projects stay empty instead of showing another project's numbers", () => {
  const progress = computeProgress(base, "repo:missing");
  assert.equal(progress.totalCards, 0);
  assert.equal(progress.explained, 0);
  assert.equal(progress.canStillExplain, 0);
  assert(progress.answersPerDay.every((day) => day.answers === 0));
  assert.equal(progress.byProject.length, 2);
});

test("defended counts distinct visible decisions, stays project-scoped, and does not advance ownership", () => {
  const input = { ...base, defendedCardIds: ["a", "a", "d", "hidden", "unknown"] };
  const all = computeProgress(input);
  assert.equal(all.defended, 2);
  assert.deepEqual(all.steps, computeProgress(base).steps);
  const scoped = computeProgress(input, "repo:coach");
  assert.equal(scoped.defended, 1);
  assert.equal(scoped.steps.mastered, 0);
  assert.equal(scoped.byProject.find((p) => p.scope === "unassigned")?.defended, 1);
  assert.equal(computeProgress(input, "repo:missing").defended, 0);
});

test("calendar dates stay consecutive across a year boundary in the learner's timezone", () => {
  const p = computeProgress({
    ...base,
    timeZone: "Asia/Kathmandu",
    now: new Date("2027-01-05T20:00:00Z"),
  });
  assert.equal(p.answersPerDay[0]?.date, "2026-12-08");
  assert.equal(p.answersPerDay.at(-1)?.date, "2027-01-06");
  assert.equal(new Set(p.answersPerDay.map((d) => d.date)).size, 30);
  assert(
    p.answersPerDay.every(
      (d, i, days) => i === 0 || Date.parse(d.date) - Date.parse(days[i - 1]!.date) === 86400000,
    ),
  );
});
