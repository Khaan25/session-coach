import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { checkEvidence } from "../pipeline/evidence.ts";
import { extractCards } from "../pipeline/extract.ts";
import { parseSession } from "../pipeline/parser.ts";
import { fakeModel } from "./fake.ts";

const fixture = await readFile(
  new URL("../pipeline/fixtures/session.fake.jsonl", import.meta.url),
  "utf8",
);

const model = (task: "extract", input: { data: Record<string, unknown> }) =>
  Promise.resolve(fakeModel(task, input.data));

test("fake extraction on a real parsed log gives cards that survive the evidence check", async () => {
  const { events } = parseSession(fixture);
  const { cards: drafts, title } = await extractCards(events, model);
  assert.match(title ?? "", /^FAKE: /u);
  assert.ok(drafts.length > 0 && drafts.length <= 3);
  assert.equal(checkEvidence(drafts, events).length, drafts.length);
  const again = await extractCards(events, model);
  assert.deepEqual(again.cards, drafts);
});

test("fake extraction skips short and non-conversation events, and returns no cards when none qualify", () => {
  const events = [
    { id: "E1", kind: "prompt", text: "too short" },
    { id: "E2", kind: "bash", text: "pnpm test --filter web --run now" },
  ];
  assert.deepEqual(fakeModel("extract", { events }), {
    title: "FAKE: too short",
    decisions: [],
  });
  assert.deepEqual(fakeModel("extract", {}), {
    title: "FAKE: a session with no prompt",
    decisions: [],
  });
});

test("the fake model still refuses an unknown task", () => {
  assert.throws(() => fakeModel("summarize", {}), /no "summarize"/u);
});

test("fake follow-up rides the grade task and fits { question }", () => {
  const out = fakeModel("grade", { mode: "follow_up", question: "Why X?", answer: "because" });
  assert.deepEqual(Object.keys(out as object), ["question"]);
  assert.match((out as { question: string }).question, /^FAKE: .*Why X\?/u);
});

test("fake defense grade reads the follow-up answer too", () => {
  const model_answer = "cache the result because lookups are slow";
  assert.deepEqual(
    fakeModel("grade", {
      mode: "defend_grade",
      model_answer,
      answer: "unrelated",
      follow_up_answer: model_answer,
    }),
    { score: 2, missing: "" },
  );
  assert.equal(
    (fakeModel("grade", { model_answer, answer: "unrelated" }) as { score: number }).score,
    0,
  );
});
