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
  evidence: [{ event: "E2", quote: "put them in tokens.css so every page reuses them" }],
  files: [],
  question: "Why do the styles live in one file?",
  model_answer: "So every page reuses the same tokens.",
};

/** What `extractCards` returns for `card`: the event id is now a number. */
const parsedCard = {
  ...card,
  evidence: [{ event_index: 2, quote: "put them in tokens.css so every page reuses them" }],
};
const three = [card, card, card];
const parsedThree = [parsedCard, parsedCard, parsedCard];

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
  const { model, calls } = fakeModel({ decisions: three });
  const cards = await extractCards(events, model);
  assert.deepEqual(cards, parsedThree);
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
  const { model, calls } = fakeModel(
    { decisions: [{ ...card, source: "guess" }, card, card] },
    { decisions: three },
  );
  const cards = await extractCards(events, model);
  assert.deepEqual(cards, parsedThree);
  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.[1].data.validation_error, undefined);
  const error = calls[1]?.[1].data.validation_error;
  assert.equal(typeof error, "string");
  assert.match(String(error), /source/);
  assert.equal(typeof calls[1]?.[1].data.fix, "string");
  assert.deepEqual(calls[1]?.[1].data.events, calls[0]?.[1].data.events);
});

test("invalid twice throws a clear error after exactly two calls", async () => {
  const bad = { decisions: "none" };
  const { model, calls } = fakeModel(bad, bad, { decisions: three });
  await assert.rejects(
    extractCards(events, model),
    (error: unknown) => error instanceof ExtractError && /invalid cards twice/.test(error.message),
  );
  assert.equal(calls.length, 2);
});

test("3 and 5 decisions are accepted", async () => {
  for (const count of [3, 5]) {
    const answer = { decisions: Array.from({ length: count }, () => card) };
    assert.equal((await extractCards(events, fakeModel(answer).model)).length, count);
  }
});

test("2 decisions or 6 decisions fail the schema and trigger the single retry", async () => {
  for (const count of [2, 6]) {
    const answer = { decisions: Array.from({ length: count }, () => card) };
    const { model, calls } = fakeModel(answer, answer);
    await assert.rejects(extractCards(events, model), ExtractError);
    assert.equal(calls.length, 2);
  }
});

test('"E2" converts to event_index 2', async () => {
  const [first] = await extractCards(events, fakeModel({ decisions: three }).model);
  assert.deepEqual(first?.evidence, [
    { event_index: 2, quote: "put them in tokens.css so every page reuses them" },
  ]);
});

test('an event other than "E<number>" fails the schema', async () => {
  for (const event of ["X2", "2", "E", "e2", "E1.5"]) {
    const bad = { ...card, evidence: [{ event, quote: "x" }] };
    const answer = { decisions: [bad, card, card] };
    const { model, calls } = fakeModel(answer, answer);
    await assert.rejects(extractCards(events, model), ExtractError);
    assert.equal(calls.length, 2);
  }
});

test("a whitespace-only quote fails the schema", async () => {
  const bad = { ...card, evidence: [{ event: "E2", quote: " \n\t " }] };
  const answer = { decisions: [bad, card, card] };
  const { model, calls } = fakeModel(answer, answer);
  await assert.rejects(extractCards(events, model), ExtractError);
  assert.equal(calls.length, 2);
});

test("evidence needs 1 to 3 items", async () => {
  const item = card.evidence[0];
  for (const evidence of [[], [item, item, item, item]]) {
    const answer = { decisions: [{ ...card, evidence }, card, card] };
    const { model, calls } = fakeModel(answer, answer);
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
