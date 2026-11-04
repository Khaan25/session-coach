import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ANSWER_SECONDS,
  deadlineOf,
  defendAnswerSchema,
  defendGradeData,
  followUpData,
  FOLLOW_UP_SECONDS,
  GRACE_MS,
  isLate,
  openWindow,
  parseFollowUp,
  pickCard,
} from "./defend.ts";

const start = "2026-11-05T10:00:00.000Z";
const at = (seconds: number, ms = 0) => new Date(new Date(start).getTime() + seconds * 1000 + ms);

test("the answer window is 180 s and the follow-up 120 s", () => {
  assert.equal(ANSWER_SECONDS, 180);
  assert.equal(FOLLOW_UP_SECONDS, 120);
  assert.equal(deadlineOf(start, ANSWER_SECONDS).toISOString(), "2026-11-05T10:03:00.000Z");
});

test("an answer is on time until the deadline plus 5 s, and late after", () => {
  assert.equal(GRACE_MS, 5_000);
  assert.equal(isLate(start, ANSWER_SECONDS, at(0)), false);
  assert.equal(isLate(start, ANSWER_SECONDS, at(180)), false);
  assert.equal(isLate(start, ANSWER_SECONDS, at(185)), false);
  assert.equal(isLate(start, ANSWER_SECONDS, at(185, 1)), true);
  assert.equal(isLate(start, FOLLOW_UP_SECONDS, at(125)), false);
  assert.equal(isLate(start, FOLLOW_UP_SECONDS, at(125, 1)), true);
});

test("isLate takes a Date or an ISO string", () => {
  assert.equal(isLate(new Date(start), ANSWER_SECONDS, at(186)), true);
});

test("openWindow gives the clock an unfinished defense is on", () => {
  const followUpAt = "2026-11-05T10:02:00.000Z";
  assert.deepEqual(
    openWindow({ status: "answering", started_at: start, follow_up_started_at: null }),
    { startedAt: start, seconds: 180 },
  );
  assert.deepEqual(
    openWindow({ status: "follow_up", started_at: start, follow_up_started_at: followUpAt }),
    { startedAt: followUpAt, seconds: 120 },
  );
  for (const status of ["finished", "expired"])
    assert.equal(openWindow({ status, started_at: start, follow_up_started_at: followUpAt }), null);
  assert.equal(
    openWindow({ status: "follow_up", started_at: start, follow_up_started_at: null }),
    null,
  );
});

test("pickCard picks by the random number and never past the end", () => {
  const ids = ["a", "b", "c"];
  assert.equal(
    pickCard(ids, () => 0),
    "a",
  );
  assert.equal(
    pickCard(ids, () => 0.5),
    "b",
  );
  assert.equal(
    pickCard(ids, () => 0.99),
    "c",
  );
  assert.equal(
    pickCard(ids, () => 1),
    "c",
  );
});

test("pickCard gives null with nothing to defend and counts a repeated card once", () => {
  assert.equal(pickCard([]), null);
  // Two answers of 2 on "a" must not make it twice as likely.
  assert.equal(
    pickCard(["a", "a", "b"], () => 0.6),
    "b",
  );
  assert.ok(["a", "b"].includes(pickCard(["a", "b"]) ?? ""));
});

test("the answer body is trimmed, non-empty and capped", () => {
  assert.deepEqual(defendAnswerSchema.parse({ answer: "  because  " }), { answer: "because" });
  assert.equal(defendAnswerSchema.safeParse({ answer: "   " }).success, false);
  assert.equal(defendAnswerSchema.safeParse({}).success, false);
  assert.equal(defendAnswerSchema.safeParse({ answer: "x".repeat(4001) }).success, false);
});

test("parseFollowUp accepts { question } and rejects anything else", () => {
  assert.equal(parseFollowUp({ question: " What breaks? " }), "What breaks?");
  assert.equal(parseFollowUp({ question: "" }), null);
  assert.equal(parseFollowUp({ score: 2, missing: "" }), null);
  assert.equal(parseFollowUp(null), null);
});

test("the prompt data carries the card and answers but no ids", () => {
  const card = {
    question: "Why?",
    why: "Because",
    evidence: [{ quote: "q" }],
    model_answer: "key",
  };
  const followUp = followUpData(card, "mine");
  assert.equal(followUp.mode, "follow_up");
  assert.equal(followUp.answer, "mine");
  const grade = defendGradeData(card, {
    answer: "mine",
    followUpQuestion: "And?",
    followUpAnswer: "yes",
  });
  assert.equal(grade.mode, "defend_grade");
  assert.deepEqual(Object.keys(grade).sort(), [
    "answer",
    "evidence",
    "follow_up_answer",
    "follow_up_question",
    "mode",
    "model_answer",
    "question",
    "why",
  ]);
});
