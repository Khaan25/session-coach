import assert from "node:assert/strict";
import { test } from "node:test";

import { localDate } from "../sessions/rows.ts";
import { answeredSince, countAnsweredToday, DAILY_CAP, NEW_SLOTS, todayQueue } from "./today.ts";

const now = new Date("2026-11-04T12:00:00Z");
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();
const dueCards = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `due${i}`, dueOn: `2026-11-0${4 - (i % 4)}` }));
const newCards = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `new${i}`, createdAt: hoursAgo(i + 1) }));
const ids = (queue: { due: { id: string }[]; fresh: { id: string }[] }) =>
  [...queue.due, ...queue.fresh].map(({ id }) => id);

test("the day is capped at 5, with 2 slots kept for new cards", () => {
  const queue = todayQueue({ due: dueCards(10), fresh: newCards(10), answeredToday: 0, now });
  assert.equal(queue.due.length, DAILY_CAP - NEW_SLOTS);
  assert.equal(queue.fresh.length, NEW_SLOTS);
});

test("due cards go oldest due first, new cards newest first", () => {
  const due = [
    { id: "b", dueOn: "2026-11-03" },
    { id: "a", dueOn: "2026-11-01" },
    { id: "c", dueOn: "2026-11-04" },
  ];
  const fresh = [
    { id: "old", createdAt: hoursAgo(48) },
    { id: "newest", createdAt: hoursAgo(1) },
  ];
  assert.deepEqual(ids(todayQueue({ due, fresh, answeredToday: 0, now })), [
    "a",
    "b",
    "c",
    "newest",
    "old",
  ]);
});

test("new cards fill the slots due cards leave empty, and the other way round", () => {
  assert.equal(todayQueue({ due: [], fresh: newCards(9), answeredToday: 0, now }).fresh.length, 5);
  assert.equal(todayQueue({ due: dueCards(9), fresh: [], answeredToday: 0, now }).due.length, 5);
  const one = todayQueue({ due: dueCards(9), fresh: newCards(1), answeredToday: 0, now });
  assert.deepEqual([one.due.length, one.fresh.length], [4, 1]);
});

test("answers given today use up the day, clamped at 0", () => {
  const after3 = todayQueue({ due: dueCards(9), fresh: newCards(9), answeredToday: 3, now });
  // 2 left: both kept for new cards.
  assert.deepEqual([after3.due.length, after3.fresh.length], [0, 2]);
  const after4 = todayQueue({ due: dueCards(9), fresh: newCards(9), answeredToday: 4, now });
  assert.deepEqual([after4.due.length, after4.fresh.length], [0, 1]);
  for (const answeredToday of [5, 7]) {
    const done = todayQueue({ due: dueCards(9), fresh: newCards(9), answeredToday, now });
    assert.deepEqual(ids(done), []);
  }
});

test("new cards older than 7 days are left out", () => {
  const fresh = [{ id: "stale", createdAt: hoursAgo(8 * 24) }];
  assert.deepEqual(ids(todayQueue({ due: [], fresh, answeredToday: 0, now })), []);
});

test("answers count on the learner's local day, not the server's", () => {
  // 2026-11-04T12:00Z is 01:00 on the 5th in Auckland (UTC+13) and 07:00 on the 4th in New York (UTC-5).
  const answeredAt = ["2026-11-04T10:30:00Z", "2026-11-04T11:30:00Z", "2026-11-03T23:00:00Z"];
  const auckland = "Pacific/Auckland";
  const newYork = "America/New_York";
  assert.equal(localDate(auckland, now), "2026-11-05");
  // 10:30Z is 23:30 on the 4th in Auckland, 11:30Z is 00:30 on the 5th.
  assert.equal(countAnsweredToday(answeredAt, auckland, localDate(auckland, now)), 1);
  // 23:00Z on the 3rd is 18:00 on the 3rd in New York.
  assert.equal(countAnsweredToday(answeredAt, newYork, localDate(newYork, now)), 2);
  assert.equal(countAnsweredToday(answeredAt, "UTC", "2026-11-04"), 2);
});

test("answeredSince reaches back past the start of any local day, 25 hours on a DST day", () => {
  assert.ok(Date.parse(answeredSince(now)) <= now.getTime() - 25 * 3_600_000);
});
