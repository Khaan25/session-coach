import assert from "node:assert/strict";
import { test } from "node:test";
import { evidenceSchema } from "@session-coach/shared/decision";
import { checkEvidence } from "./evidence.ts";
import type { ExtractedCard } from "./extract.ts";
import type { EventKind, TimelineEvent } from "./parser.ts";

const event = (n: number, kind: EventKind, text: string): TimelineEvent => ({
  id: `E${n}`,
  kind,
  text,
  line: n,
});

const events: TimelineEvent[] = [
  event(1, "prompt", "Keep the shared styles in one tokens file."),
  event(2, "reply", "I will put them in tokens.css\nso   every page reuses them."),
  event(3, "edit", "src/styles/tokens.css — replaced 1 line with 2: --gap: 4px;"),
  event(4, "bash", "pnpm test --filter web"),
  event(5, "edit", "docs/DECISIONS.md — replaced 0 lines with 3: ## Styles"),
  event(6, "write", "src/other.ts — wrote 4 lines"),
];

const draft = (
  evidence: ExtractedCard["evidence"],
  source: ExtractedCard["source"] = "stated",
): ExtractedCard => ({
  decision: "Shared styles live in tokens.css.",
  why: "Every page reuses one file.",
  source,
  evidence,
  files: ["src/styles/tokens.css"],
  question: "Why one file?",
  model_answer: "So every page reuses it.",
});

const check = (evidence: ExtractedCard["evidence"], source?: ExtractedCard["source"]) => {
  const [card] = checkEvidence([draft(evidence, source)], events);
  assert.ok(card);
  return card;
};

test("verified is true when the quote is in the cited event, false when it is not", () => {
  const card = check([
    { event_index: 1, quote: "shared styles in one tokens file" },
    { event_index: 1, quote: "styles in two files" },
    { event_index: 4, quote: "shared styles in one tokens file" },
  ]);
  assert.deepEqual(
    card.evidence.map((e) => e.verified),
    [true, false, false],
  );
});

test("whitespace is collapsed on both sides before comparing", () => {
  const card = check([
    { event_index: 2, quote: "put  them in\ttokens.css so every page reuses them" },
  ]);
  assert.equal(card.evidence[0]?.verified, true);
});

test("an out-of-range index is unverified with no file", () => {
  const card = check([
    { event_index: 99, quote: "anything" },
    { event_index: events.length + 1, quote: "anything" },
  ]);
  for (const item of card.evidence) {
    assert.equal(item.verified, false);
    assert.equal(item.file, null);
    assert.equal(item.lines, null);
  }
});

test("file is the path before ' — ' for write and edit events, null otherwise", () => {
  const card = check([
    { event_index: 3, quote: "replaced 1 line with 2" },
    { event_index: 6, quote: "wrote 4 lines" },
    { event_index: 1, quote: "shared styles" },
  ]);
  assert.deepEqual(
    card.evidence.map((e) => e.file),
    ["src/styles/tokens.css", "src/other.ts", null],
  );
  assert.ok(card.evidence.every((e) => e.lines === null));
});

test("stated stays when a verified quote is a prompt or a reply", () => {
  assert.equal(
    check([{ event_index: 1, quote: "shared styles in one tokens file" }]).source,
    "stated",
  );
  assert.equal(check([{ event_index: 2, quote: "every page reuses them" }]).source, "stated");
});

test("stated stays when the verified quote is a DECISIONS.md write or edit", () => {
  assert.equal(check([{ event_index: 5, quote: "replaced 0 lines with 3" }]).source, "stated");
});

test("stated becomes inferred without a verified prompt, reply or DECISIONS.md quote", () => {
  // Verified, but from a bash event.
  assert.equal(check([{ event_index: 4, quote: "pnpm test" }]).source, "inferred");
  // Verified, but from an edit of another file.
  assert.equal(check([{ event_index: 3, quote: "replaced 1 line" }]).source, "inferred");
  // A prompt quote that is not in the event.
  assert.equal(
    check([{ event_index: 1, quote: "invented words nobody wrote" }]).source,
    "inferred",
  );
  // The grounded quote is unverified; the verified one is a bash event.
  assert.equal(
    check([
      { event_index: 99, quote: "x" },
      { event_index: 4, quote: "pnpm test" },
    ]).source,
    "inferred",
  );
});

test("inferred is never upgraded", () => {
  assert.equal(
    check([{ event_index: 1, quote: "shared styles in one tokens file" }], "inferred").source,
    "inferred",
  );
});

test("position is the array index; no id, flagged or hidden is set; evidence fits the shared schema", () => {
  const cards = checkEvidence(
    [
      draft([{ event_index: 1, quote: "shared styles" }]),
      draft([{ event_index: 3, quote: "replaced 1 line" }]),
    ],
    events,
  );
  assert.deepEqual(
    cards.map((c) => c.position),
    [0, 1],
  );
  for (const card of cards) {
    for (const key of ["id", "session_id", "user_id", "created_at", "flagged", "hidden"])
      assert.equal(key in card, false);
    for (const item of card.evidence) assert.ok(evidenceSchema.safeParse(item).success);
  }
});

test("no drafts gives no cards", () => {
  assert.deepEqual(checkEvidence([], events), []);
});
