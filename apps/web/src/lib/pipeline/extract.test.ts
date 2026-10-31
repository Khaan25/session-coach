import assert from "node:assert/strict";
import { test } from "node:test";
import { EXTRACT_INSTRUCTIONS, ExtractError, extractCards, type ExtractModel } from "./extract.ts";
import type { TimelineEvent } from "./parser.ts";

const events: TimelineEvent[] = [
  { id: "E1", kind: "prompt", text: "Keep the shared styles in one tokens file.", line: 3 },
  {
    id: "E2",
    kind: "reply",
    text: "I will put them in tokens.css so every page reuses them.",
    line: 5,
  },
];

const card = {
  decision: "Shared styles live in tokens.css.",
  why: "Every page reuses one file.",
  source: "stated",
  evidence: [{ event_index: 2, quote: "put them in tokens.css so every page reuses them" }],
  files: [],
  question: "Why do the styles live in one file?",
  model_answer: "So every page reuses the same tokens.",
};

/** A fake model that answers from a list and records each call. */
function fakeModel(...answers: unknown[]) {
  const calls: Parameters<ExtractModel>[] = [];
  const model: ExtractModel = async (task, input) => {
    calls.push([task, input]);
    return answers[calls.length - 1];
  };
  return { model, calls };
}

test("valid on the first try: one call, task extract, timeline without line numbers", async () => {
  const { model, calls } = fakeModel({ cards: [card] });
  const cards = await extractCards(events, model);
  assert.deepEqual(cards, [card]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.[0], "extract");
  assert.equal(calls[0]?.[1].instructions, EXTRACT_INSTRUCTIONS);
  assert.deepEqual(calls[0]?.[1].data, {
    events: [
      { id: "E1", kind: "prompt", text: events[0]?.text },
      { id: "E2", kind: "reply", text: events[1]?.text },
    ],
  });
});

test("invalid then valid: the second call carries the validation error", async () => {
  const { model, calls } = fakeModel({ cards: [{ ...card, source: "guess" }] }, { cards: [card] });
  const cards = await extractCards(events, model);
  assert.deepEqual(cards, [card]);
  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.[1].data.validation_error, undefined);
  const error = calls[1]?.[1].data.validation_error;
  assert.equal(typeof error, "string");
  assert.match(String(error), /source/);
  assert.equal(typeof calls[1]?.[1].data.fix, "string");
  assert.deepEqual(calls[1]?.[1].data.events, calls[0]?.[1].data.events);
});

test("invalid twice throws a clear error after exactly two calls", async () => {
  const bad = { cards: "none" };
  const { model, calls } = fakeModel(bad, bad, { cards: [card] });
  await assert.rejects(
    extractCards(events, model),
    (error: unknown) => error instanceof ExtractError && /invalid cards twice/.test(error.message),
  );
  assert.equal(calls.length, 2);
});

test("0 cards is a valid answer", async () => {
  const { model, calls } = fakeModel({ cards: [] });
  assert.deepEqual(await extractCards(events, model), []);
  assert.equal(calls.length, 1);
});

test("5 cards are accepted, more than 5 are rejected", async () => {
  const five = { cards: Array.from({ length: 5 }, () => card) };
  assert.equal((await extractCards(events, fakeModel(five).model)).length, 5);

  const six = { cards: Array.from({ length: 6 }, () => card) };
  const { model, calls } = fakeModel(six, six);
  await assert.rejects(extractCards(events, model), ExtractError);
  assert.equal(calls.length, 2);
});

test("evidence needs 1 to 3 items with a positive integer event_index", async () => {
  const item = card.evidence[0];
  const invalid = [
    { ...card, evidence: [] },
    { ...card, evidence: [item, item, item, item] },
    { ...card, evidence: [{ ...item, event_index: 0 }] },
    { ...card, evidence: [{ ...item, event_index: 1.5 }] },
  ];
  for (const bad of invalid) {
    const { model, calls } = fakeModel({ cards: [bad] }, { cards: [bad] });
    await assert.rejects(extractCards(events, model), ExtractError);
    assert.equal(calls.length, 2);
  }
});

test("an error thrown by the model itself passes through without a retry", async () => {
  const calls: number[] = [];
  const model: ExtractModel = async () => {
    calls.push(1);
    throw new Error("provider down");
  };
  await assert.rejects(extractCards(events, model), /provider down/);
  assert.equal(calls.length, 1);
});
