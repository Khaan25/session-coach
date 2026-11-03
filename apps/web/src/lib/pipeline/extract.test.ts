import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ExtractError,
  MAX_CARDS,
  RETRY_DELAY_MS,
  QUESTION_LEVELS,
  extractCards,
  extractInstructions,
  type ExtractModel,
  type ExtractOptions,
} from "./extract.ts";
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

/** Options for tests that may retry: the wait is recorded, never waited. */
function noWait() {
  const delays: number[] = [];
  const options: ExtractOptions = {
    sleep: async (ms) => {
      delays.push(ms);
    },
  };
  return { delays, options };
}

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
  assert.equal(calls[0]?.[1].instructions, extractInstructions("simple"));
  assert.deepEqual(calls[0]?.[1].data, {
    events: [
      { id: "E1", kind: "prompt", text: events[0]?.text },
      { id: "E2", kind: "reply", text: events[1]?.text },
    ],
  });
});

test("invalid then valid: the second call carries the failed answer and the validation error", async () => {
  const badAnswer = { decisions: [{ ...card, source: "guess" }] };
  const { model, calls } = fakeModel(badAnswer, { decisions: three });
  const cards = await extractCards(events, model, noWait().options);
  assert.deepEqual(cards, parsedThree);
  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.[1].data.validation_error, undefined);
  assert.equal(calls[0]?.[1].data.previous_answer, undefined);
  assert.deepEqual(calls[1]?.[1].data.previous_answer, badAnswer);
  const error = calls[1]?.[1].data.validation_error;
  assert.equal(typeof error, "string");
  assert.match(String(error), /source/);
  assert.equal(typeof calls[1]?.[1].data.fix, "string");
  assert.deepEqual(calls[1]?.[1].data.events, calls[0]?.[1].data.events);
});

test("the retry waits before the second call, using the injected delay", async () => {
  const bad = { decisions: "none" };
  const order: string[] = [];
  const model: ExtractModel = async () => {
    order.push("call");
    return order.length === 1 ? bad : { decisions: three };
  };
  const sleep = async (ms: number) => {
    order.push(`sleep ${ms}`);
  };
  await extractCards(events, model, { retryDelayMs: 1234, sleep });
  assert.deepEqual(order, ["call", "sleep 1234", "call"]);
});

test("the retry waits 60 seconds by default", async () => {
  const bad = { decisions: "none" };
  const { delays, options } = noWait();
  await extractCards(events, fakeModel(bad, { decisions: three }).model, options);
  assert.equal(RETRY_DELAY_MS, 60_000);
  assert.deepEqual(delays, [RETRY_DELAY_MS]);
});

test("a valid first answer never waits", async () => {
  const { delays, options } = noWait();
  await extractCards(events, fakeModel({ decisions: three }).model, options);
  assert.deepEqual(delays, []);
});

test("invalid twice throws a clear error after exactly two calls", async () => {
  const bad = { decisions: "none" };
  const { model, calls } = fakeModel(bad, bad, { decisions: three });
  await assert.rejects(
    extractCards(events, model, noWait().options),
    (error: unknown) => error instanceof ExtractError && /invalid cards twice/.test(error.message),
  );
  assert.equal(calls.length, 2);
});

test("0 to 5 decisions are accepted on the first call", async () => {
  for (const count of [0, 1, 2, 3, 5]) {
    const answer = { decisions: Array.from({ length: count }, () => card) };
    const { model, calls } = fakeModel(answer);
    assert.equal((await extractCards(events, model)).length, count);
    assert.equal(calls.length, 1);
  }
});

test("more than 5 valid decisions keeps the first 5, without a retry", async () => {
  const answer = {
    decisions: Array.from({ length: 7 }, (_, i) => ({ ...card, decision: `D${i}` })),
  };
  const { model, calls } = fakeModel(answer);
  const cards = await extractCards(events, model);
  assert.equal(MAX_CARDS, 5);
  assert.deepEqual(
    cards.map((c) => c.decision),
    ["D0", "D1", "D2", "D3", "D4"],
  );
  assert.equal(calls.length, 1);
});

test("the cap counts valid cards: invalid ones are dropped first", async () => {
  const bad = { ...card, source: "guess" };
  const answer = { decisions: [bad, card, bad, card, card, card, card, card] };
  assert.deepEqual(await extractCards(events, fakeModel(answer).model), Array(5).fill(parsedCard));
});

test('"E2" converts to event_index 2', async () => {
  const [first] = await extractCards(events, fakeModel({ decisions: three }).model);
  assert.deepEqual(first?.evidence, [
    { event_index: 2, quote: "put them in tokens.css so every page reuses them" },
  ]);
});

test('a card citing an event other than "E<positive number>" is dropped, the others kept', async () => {
  for (const event of ["X2", "2", "E", "e2", "E1.5", "E0", "E01"]) {
    const bad = { ...card, evidence: [{ event, quote: "x" }] };
    const { model, calls } = fakeModel({ decisions: [bad, card, card] });
    assert.deepEqual(await extractCards(events, model), [parsedCard, parsedCard]);
    assert.equal(calls.length, 1);
  }
});

test("a whitespace-only quote drops its card", async () => {
  const bad = { ...card, evidence: [{ event: "E2", quote: " \n\t " }] };
  const answer = { decisions: [bad, card, card] };
  assert.equal((await extractCards(events, fakeModel(answer).model)).length, 2);
});

test("evidence needs 1 to 3 items, else the card is dropped", async () => {
  const item = card.evidence[0];
  for (const evidence of [[], [item, item, item, item]]) {
    const answer = { decisions: [{ ...card, evidence }, card, card] };
    assert.equal((await extractCards(events, fakeModel(answer).model)).length, 2);
  }
});

test("cards that are all invalid trigger the retry, with each card's error", async () => {
  const bad = {
    decisions: [
      { ...card, evidence: [{ event: "E0", quote: "x" }] },
      { ...card, source: "guess" },
    ],
  };
  const { model, calls } = fakeModel(bad, { decisions: three });
  assert.deepEqual(await extractCards(events, model, noWait().options), parsedThree);
  assert.equal(calls.length, 2);
  const error = String(calls[1]?.[1].data.validation_error);
  assert.match(error, /decisions\[0\]/);
  assert.match(error, /decisions\[1\]/);
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

test("an abort during the retry wait stops before the second call, and the signal reaches the model", async () => {
  const stop = new AbortController();
  const signals: (AbortSignal | undefined)[] = [];
  const model: ExtractModel = async (_task, input) => {
    signals.push(input.signal);
    return { decisions: "not a list" };
  };
  const sleep = async () => stop.abort();
  await assert.rejects(extractCards(events, model, { sleep, signal: stop.signal }), {
    name: "AbortError",
  });
  assert.deepEqual(signals, [stop.signal]);
});

test("each level puts its own question instructions in the prompt, and nothing else changes", () => {
  const simple = extractInstructions("simple");
  assert.match(
    simple,
    /Level simple: a one-step "why did we do X" question, answerable in 1 to 2 sentences/,
  );
  assert.match(
    extractInstructions("hard"),
    /Level hard: ask about the trade-off, or the alternative that was rejected/,
  );
  assert.match(
    extractInstructions("complex"),
    /Level complex: ask the developer to reason across two decisions/,
  );
  for (const level of ["simple", "hard", "complex"] as const) {
    const prompt = extractInstructions(level);
    for (const [other, line] of Object.entries(QUESTION_LEVELS)) {
      assert.equal(prompt.includes(line), other === level, `${level} prompt and ${other} line`);
    }
    // Same output shape and evidence rules at every level.
    assert.equal(
      prompt.replace(QUESTION_LEVELS[level], ""),
      simple.replace(QUESTION_LEVELS.simple, ""),
    );
  }
});

test("the default level is simple, and extractCards sends the level it is given", async () => {
  assert.equal(extractInstructions(), extractInstructions("simple"));
  const { model, calls } = fakeModel({ decisions: [card] }, { decisions: [card] });
  await extractCards(events, model);
  await extractCards(events, model, { level: "complex" });
  assert.equal(calls[0]?.[1].instructions, extractInstructions("simple"));
  assert.equal(calls[1]?.[1].instructions, extractInstructions("complex"));
});

test("the retry keeps the level", async () => {
  const { model, calls } = fakeModel(
    { decisions: [{ ...card, source: "guess" }] },
    { decisions: [card] },
  );
  await extractCards(events, model, { ...noWait().options, level: "hard" });
  assert.equal(calls[1]?.[1].instructions, extractInstructions("hard"));
});
