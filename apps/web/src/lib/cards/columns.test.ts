import assert from "node:assert/strict";
import { test } from "node:test";

import { lockUnanswered, type CardView } from "./columns.ts";

const full = (id: string): CardView => ({
  id,
  position: Number(id.at(-1)),
  decision: `decision ${id}`,
  why: `why ${id}`,
  source: "stated",
  evidence: [{ event_index: 1, quote: "a quote", file: null, lines: null, verified: true }],
  files: ["a.ts"],
  question: `question ${id}`,
  flagged: false,
});

test("lockUnanswered keeps only the decision and question of a card with no answer yet", () => {
  const heads = [full("c0"), full("c1")].map(({ id, position, decision, question }) => ({
    id,
    position,
    decision,
    question,
  }));
  const cards = lockUnanswered(heads, [full("c1")]);
  assert.deepEqual(cards[0], {
    id: "c0",
    position: 0,
    decision: "decision c0",
    question: "question c0",
    locked: true,
  });
  assert.ok(!("why" in cards[0]) && !("evidence" in cards[0]));
  assert.deepEqual(cards[1], { ...full("c1"), locked: false });
});

test("lockUnanswered keeps the heads' order and ignores reveals for other cards", () => {
  const heads = [{ id: "c1", position: 1, decision: "d", question: "q" }];
  assert.deepEqual(lockUnanswered(heads, [full("c9")]), [
    { id: "c1", position: 1, decision: "d", question: "q", locked: true },
  ]);
});
