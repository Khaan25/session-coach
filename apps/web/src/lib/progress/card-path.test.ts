import assert from "node:assert/strict";
import { test } from "node:test";

import { cardPath, type CardPathInput } from "./card-path.ts";

const base: CardPathInput = {
  decision: "Rate limit uploads per CLI token",
  session: "Add rate limiting",
  createdAt: "2026-10-23T09:00:00Z",
  answers: [
    { score: 1, review_step: 0, skipped: false, created_at: "2026-10-23T10:00:00Z" },
    { score: 2, review_step: 1, skipped: false, created_at: "2026-10-24T10:00:00Z" },
    { score: 2, review_step: 2, skipped: false, created_at: "2026-10-27T10:00:00Z" },
  ],
  review: { step: 3, due_on: "2026-11-03", mastered: false },
  timeZone: "UTC",
  now: new Date("2026-11-03T12:00:00Z"),
};

test("replays each answer through the schedule: day 1, 4, then 11", () => {
  const path = cardPath(base);
  assert.deepEqual(
    path.stops.map(({ date, step, outcome }) => [date, step, outcome]),
    [
      ["Oct 23", "New", "Waiting for your first answer."],
      ["Oct 23", "Day 1", "Partly, so it starts on day 1: due Oct 24."],
      ["Oct 24", "Day 4", "Explained, so it moves up to day 4: due Oct 27."],
      ["Oct 27", "Day 11", "Explained, so it moves up to day 11: due today."],
    ],
  );
  assert.deepEqual(path.next, {
    date: "Today",
    what: "Day 11 review",
    outcome:
      "Explain it now and it becomes owned. Partly or Missed sends it back to day 4, due tomorrow.",
    dueToday: true,
  });
});

test("a pass on day 11 owns the card and ends the path", () => {
  const path = cardPath({
    ...base,
    answers: [
      ...base.answers,
      { score: 2, review_step: 3, skipped: false, created_at: "2026-11-03T10:00:00Z" },
    ],
    review: { step: 3, due_on: null, mastered: true },
  });
  assert.equal(path.stops.at(-1)?.step, "Owned");
  assert.equal(path.next, null);
});

test("a miss moves the card back a step, due the next day", () => {
  const path = cardPath({
    ...base,
    answers: [{ score: 0, review_step: 2, skipped: false, created_at: "2026-10-30T10:00:00Z" }],
    review: { step: 1, due_on: "2026-10-31", mastered: false },
  });
  assert.equal(path.stops[1]?.outcome, "Missed, so it goes back to day 1: due Oct 31.");
  assert.equal(path.next?.dueToday, true);
});
