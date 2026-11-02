import assert from "node:assert/strict";
import { test } from "node:test";
import { evidenceSchema } from "@session-coach/shared/decision";
import { checkEvidence, isGrounded } from "./evidence.ts";
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
  event(4, "bash", "pnpm test --filter web --run"),
  event(
    5,
    "edit",
    "docs/DECISIONS.md — replaced 0 lines with 3: Styles live in tokens.css so pages share",
  ),
  event(6, "write", "src/other.ts — wrote 4 lines"),
  event(7, "write", "docs/DECISIONS.md — wrote 40 lines"),
  event(8, "reply", "我们把共享样式放在一个文件里，这样每个页面都能复用。"),
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

/** A prompt quote that always verifies, so a card is kept while the quotes under test are checked. */
const anchor = { event_index: 1, quote: "shared styles in one tokens file" };

const check = (evidence: ExtractedCard["evidence"], source?: ExtractedCard["source"]) => {
  const [card] = checkEvidence([draft([anchor, ...evidence], source)], events);
  assert.ok(card);
  return { ...card, evidence: card.evidence.slice(1) };
};

const checkAll = (drafts: ExtractedCard[]) => checkEvidence(drafts, events);

test("verified is true when the quote is in the cited event, false when it is not", () => {
  const card = check([
    { event_index: 1, quote: "shared styles in one tokens file" },
    { event_index: 1, quote: "styles in two separate files" },
    { event_index: 4, quote: "shared styles in one tokens file" },
  ]);
  assert.deepEqual(
    card.evidence.map((e) => e.verified),
    [true, false, false],
  );
});

test("a quote under 5 words is unverified even when it is in the event, and does not ground a card", () => {
  const short = { event_index: 1, quote: "shared styles in one" };
  assert.equal(check([short]).evidence[0]?.verified, false);
  assert.equal(isGrounded(draft([short]), events), false);
  assert.deepEqual(checkAll([draft([short])]), []);
});

test("a quote of 5 words that is in the event is verified and grounds a card", () => {
  const five = { event_index: 1, quote: "shared styles in one tokens" };
  assert.equal(check([five]).evidence[0]?.verified, true);
  assert.equal(isGrounded(draft([five]), events), true);
  assert.equal(checkAll([draft([five])]).length, 1);
});

test("words are counted after whitespace is collapsed", () => {
  const verified = (quote: string) => check([{ event_index: 2, quote }]).evidence[0]?.verified;
  assert.equal(verified("so\n every\tpage   reuses them"), true);
  assert.equal(verified("  every  page \n reuses them  "), false);
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
    { event_index: 6, quote: "src/other.ts — wrote 4 lines" },
    { event_index: 1, quote: "Keep the shared styles in" },
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
  assert.equal(check([{ event_index: 2, quote: "so every page reuses them" }]).source, "stated");
});

test("stated stays when the verified quote is the written words of a DECISIONS.md edit", () => {
  assert.equal(check([{ event_index: 5, quote: "Styles live in tokens.css so" }]).source, "stated");
});

test("the parser's metadata of a DECISIONS.md write or edit is verified but does not ground a card", () => {
  for (const item of [
    { event_index: 5, quote: "docs/DECISIONS.md — replaced 0 lines with 3" },
    { event_index: 7, quote: "docs/DECISIONS.md — wrote 40 lines" },
  ]) {
    assert.equal(check([item]).evidence[0]?.verified, true);
    assert.equal(isGrounded(draft([item]), events), false);
  }
});

test("curly quotes, dashes, full-width forms and case don't stop a match", () => {
  const verified = (text: string, quote: string) =>
    isGrounded(draft([{ event_index: 1, quote }]), [event(1, "prompt", text)]);
  assert.equal(
    verified(
      "Don\u2019t touch the \u201Cauth\u201D module\u2014ever, please",
      `don't touch the "auth" module-ever`,
    ),
    true,
  );
  assert.equal(
    verified("Use the ＡＰＩ client in every route", "use the API client in every"),
    true,
  );
  assert.equal(verified("Keep it in one file", "keep it in two files"), false);
});

test("CJK text without spaces counts words and matches", () => {
  const item = { event_index: 8, quote: "共享样式放在一个文件里" };
  assert.equal(check([item]).evidence[0]?.verified, true);
  assert.equal(isGrounded(draft([item]), events), true);
  assert.equal(isGrounded(draft([{ event_index: 8, quote: "样式" }]), events), false);
});

test("a card whose only verified quotes are write or bash events is dropped", () => {
  assert.deepEqual(
    checkAll([draft([{ event_index: 4, quote: "pnpm test --filter web --run" }])]),
    [],
  );
  assert.deepEqual(checkAll([draft([{ event_index: 3, quote: "replaced 1 line with 2" }])]), []);
  assert.deepEqual(
    checkAll([draft([{ event_index: 6, quote: "src/other.ts — wrote 4 lines" }])]),
    [],
  );
});

test("a prompt quote that is not in the event does not ground a card", () => {
  assert.deepEqual(
    checkAll([draft([{ event_index: 1, quote: "invented words that nobody wrote" }])]),
    [],
  );
  // The grounded quote is unverified; the verified one is a bash event.
  assert.deepEqual(
    checkAll([
      draft([
        { event_index: 99, quote: "x" },
        { event_index: 4, quote: "pnpm test --filter web --run" },
      ]),
    ]),
    [],
  );
});

test("a card grounded by a DECISIONS.md edit is kept", () => {
  const cards = checkAll([draft([{ event_index: 5, quote: "Styles live in tokens.css so" }])]);
  assert.equal(cards.length, 1);
  assert.equal(cards[0]?.source, "stated");
});

test("inferred is never upgraded", () => {
  assert.equal(check([], "inferred").source, "inferred");
});

test("isGrounded is true for a verified prompt, reply or DECISIONS.md quote, false otherwise", () => {
  const grounded = (index: number, quote: string) =>
    isGrounded(draft([{ event_index: index, quote }]), events);
  assert.equal(grounded(1, "Keep the shared styles in"), true);
  assert.equal(grounded(2, "so every page reuses them"), true);
  assert.equal(grounded(5, "Styles live in tokens.css so"), true);
  assert.equal(grounded(5, "replaced 0 lines with 3"), false);
  assert.equal(grounded(4, "pnpm test --filter web --run"), false);
  assert.equal(grounded(3, "replaced 1 line with 2"), false);
  assert.equal(grounded(1, "invented words that nobody wrote"), false);
});

test("positions are 0..n-1 after drops", () => {
  const cards = checkAll([
    draft([{ event_index: 4, quote: "pnpm test --filter web --run" }]),
    draft([{ event_index: 1, quote: "Keep the shared styles in" }]),
    draft([{ event_index: 3, quote: "replaced 1 line with 2" }]),
    draft([{ event_index: 2, quote: "so every page reuses them" }]),
  ]);
  assert.deepEqual(
    cards.map((c) => c.position),
    [0, 1],
  );
});

test("no id, flagged or hidden is set; evidence fits the shared schema", () => {
  const cards = checkAll([draft([{ event_index: 1, quote: "Keep the shared styles in" }])]);
  assert.equal(cards.length, 1);
  for (const card of cards) {
    for (const key of ["id", "session_id", "user_id", "created_at", "flagged", "hidden"])
      assert.equal(key in card, false);
    for (const item of card.evidence) assert.ok(evidenceSchema.safeParse(item).success);
  }
});

test("files: a relative path matching the end of a write or edit path is kept, others are removed", () => {
  const [card] = checkAll([
    {
      ...draft([anchor]),
      files: [
        "src/styles/tokens.css", // equals an event path
        "styles/tokens.css", // ends an event path after "/"
        "tokens.css",
        "ens.css", // ends the text but not after "/"
        "src/missing.ts", // no write or edit event wrote it
        "pnpm", // a bash event is not a write
      ],
    },
  ]);
  assert.deepEqual(card?.files, ["src/styles/tokens.css", "styles/tokens.css", "tokens.css"]);
});

test("all cards dropped returns an empty array", () => {
  assert.deepEqual(
    checkAll([
      draft([{ event_index: 4, quote: "pnpm test --filter web --run" }]),
      draft([{ event_index: 6, quote: "src/other.ts — wrote 4 lines" }]),
    ]),
    [],
  );
});

test("no drafts gives no cards", () => {
  assert.deepEqual(checkEvidence([], events), []);
});
