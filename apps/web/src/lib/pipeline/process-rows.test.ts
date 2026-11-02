import assert from "node:assert/strict";
import { test } from "node:test";
import { decisionCardSchema, getEvidenceFlags } from "@session-coach/shared/decision";
import type { CheckedCard } from "./evidence.ts";
import type { TimelineEvent } from "./parser.ts";
import {
  MAX_EVENT_CHARS,
  MAX_TIMELINE_CHARS,
  MAX_TITLE_CHARS,
  buildCardRows,
  durationMinutes,
  sessionTitle,
  trimTimeline,
} from "./process-rows.ts";

const event = (n: number, length: number): TimelineEvent => ({
  id: `E${n}`,
  kind: "reply",
  text: "x".repeat(length),
  line: n,
});

const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";

const card = (position: number): CheckedCard => ({
  position,
  decision: "Use a queue",
  why: "It keeps the route fast",
  source: "stated",
  evidence: [
    { event_index: 1, quote: "a quote of five words", file: null, lines: null, verified: true },
  ],
  files: [],
  question: "Why a queue?",
  model_answer: "So the route returns at once.",
});

test("trimTimeline keeps everything that fits and cuts nothing", () => {
  const events = [event(1, 100), event(2, 100)];
  assert.deepEqual(trimTimeline(events), { kept: events, cut: 0 });
  assert.deepEqual(trimTimeline([]), { kept: [], cut: 0 });
});

test("trimTimeline stops at the first event over budget and counts the rest as cut", () => {
  // 10 events of 1,500 chars: 10 x 1,500 = 15,000 fits; the 11th would reach 16,500.
  const events = Array.from({ length: 12 }, (_, i) => event(i + 1, MAX_EVENT_CHARS));
  const { kept, cut } = trimTimeline(events);
  assert.equal(kept.length, 10);
  assert.equal(cut, 2);
  assert.deepEqual(
    kept.map((e) => e.id),
    events.slice(0, 10).map((e) => e.id),
  );
});

test("trimTimeline accepts an event that lands exactly on the budget", () => {
  const events = Array.from({ length: MAX_TIMELINE_CHARS / 1_000 }, (_, i) => event(i + 1, 1_000));
  assert.equal(trimTimeline(events).cut, 0);
  assert.equal(trimTimeline([...events, event(99, 1)]).cut, 1);
});

test("trimTimeline caps a huge first event and keeps it, instead of cutting it", () => {
  const huge = event(1, MAX_TIMELINE_CHARS + 5_000);
  const { kept, cut } = trimTimeline([huge, event(2, 100)]);
  assert.equal(cut, 0);
  assert.equal(kept.length, 2);
  assert.equal(kept[0].id, "E1");
  assert.equal(kept[0].text.length, MAX_EVENT_CHARS);
  assert.equal(kept[0].text, huge.text.slice(0, MAX_EVENT_CHARS));
});

test("trimTimeline does not change the events it was given", () => {
  const huge = event(1, MAX_EVENT_CHARS + 10);
  trimTimeline([huge]);
  assert.equal(huge.text.length, MAX_EVENT_CHARS + 10);
});

const stamped = (...stamps: string[]) =>
  stamps.map((timestamp) => JSON.stringify({ type: "user", timestamp })).join("\n");

test("durationMinutes is the rounded minutes from the earliest to the latest timestamp", () => {
  const raw = stamped("2026-11-02T10:00:00Z", "2026-11-02T10:12:00Z", "2026-11-02T10:30:20Z");
  assert.equal(durationMinutes(raw), 30);
  // Order in the file doesn't matter.
  assert.equal(durationMinutes(stamped("2026-11-02T10:30:00Z", "2026-11-02T10:00:00Z")), 30);
});

test("durationMinutes is null with one timestamp or none", () => {
  assert.equal(durationMinutes(stamped("2026-11-02T10:00:00Z")), null);
  assert.equal(durationMinutes(JSON.stringify({ type: "user" })), null);
  assert.equal(durationMinutes(""), null);
});

test("durationMinutes skips junk lines instead of throwing", () => {
  const raw = [
    "not json {",
    "",
    "42",
    "null",
    "[1,2]",
    JSON.stringify({ timestamp: 123 }),
    JSON.stringify({ timestamp: "yesterday-ish" }),
    JSON.stringify({ timestamp: "2026-11-02T10:00:00Z" }),
    JSON.stringify({ timestamp: "2026-11-02T10:05:00Z" }),
  ].join("\n");
  assert.equal(durationMinutes(raw), 5);
});

const promptEvent = (text: string): TimelineEvent => ({ id: "E1", kind: "prompt", text, line: 1 });

test("sessionTitle is the first prompt with whitespace collapsed", () => {
  const events = [event(1, 5), promptEvent("  fix the\n\n  login   bug \t"), promptEvent("later")];
  assert.equal(sessionTitle(events), "fix the login bug");
});

test("sessionTitle cuts a long prompt to the limit and adds an ellipsis", () => {
  const title = sessionTitle([promptEvent("x".repeat(200))]);
  assert.equal(title, `${"x".repeat(MAX_TITLE_CHARS)}…`);
  assert.equal(
    sessionTitle([promptEvent("y".repeat(MAX_TITLE_CHARS))]),
    "y".repeat(MAX_TITLE_CHARS),
  );
});

test("sessionTitle is null with no prompt or a blank one", () => {
  assert.equal(sessionTitle([event(1, 5)]), null);
  assert.equal(sessionTitle([]), null);
  assert.equal(sessionTitle([promptEvent(" \n\t ")]), null);
});

test("buildCardRows has no flagged or hidden, and numbers positions 0..n-1", () => {
  const rows = buildCardRows([card(7), card(3), card(9)], SESSION_ID, USER_ID);
  assert.deepEqual(
    rows.map((row) => row.position),
    [0, 1, 2],
  );
  for (const row of rows) {
    assert.equal("flagged" in row, false);
    assert.equal("hidden" in row, false);
    assert.equal(row.session_id, SESSION_ID);
    assert.equal(row.user_id, USER_ID);
  }
});

test("buildCardRows of no cards is no rows", () => {
  assert.deepEqual(buildCardRows([], SESSION_ID, USER_ID), []);
});

test("buildCardRows throws on a row the card schema rejects", () => {
  assert.throws(() => buildCardRows([{ ...card(0), evidence: [] }], SESSION_ID, USER_ID));
  assert.throws(() => buildCardRows([card(0)], "not-a-uuid", USER_ID));
});

test("a built row plus the database's columns parses with the shared decisionCardSchema", () => {
  for (const row of buildCardRows([card(0), card(1)], SESSION_ID, USER_ID)) {
    const full = {
      ...row,
      id: "33333333-3333-4333-8333-333333333333",
      created_at: "2026-11-01T09:00:00Z",
      ...getEvidenceFlags(row.evidence),
    };
    assert.deepEqual(decisionCardSchema.parse(full), full);
  }
});
