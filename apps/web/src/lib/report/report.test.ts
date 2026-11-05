import assert from "node:assert/strict";
import { test } from "node:test";

import { shapeReport, type OwnedRow } from "./report.ts";

// Rows as wide as a careless query could make them: every secret column is present, so the test proves the shaping
// drops them rather than relying on the select.
const card = (id: string, repo: string | null, extra: Record<string, unknown> = {}) =>
  ({
    card_id: id,
    updated_at: `2026-11-0${id.length}T10:00:00Z`,
    answer: `ANSWER-${id}`,
    card: {
      decision: `decision ${id}`,
      why: `WHY-${id}`,
      model_answer: `MODEL-ANSWER-${id}`,
      question: `QUESTION-${id}`,
      evidence: [
        { event_index: 1, quote: `unverified ${id}`, file: "a.ts", verified: false },
        { event_index: 2, quote: `quote ${id}`, file: `${id}.ts`, verified: true },
      ],
      files: ["fallback.ts"],
      hidden: false,
      flagged: false,
      session: { repo },
      answers: [{ answer: `ANSWER-${id}`, score: 2 }],
      ...extra,
    },
  }) as unknown as OwnedRow;

const owned: OwnedRow[] = [
  card("a", "web"),
  card("bb", "web"),
  card("ccc", "api"),
  card("hidden", "web", {
    hidden: true,
    evidence: [{ event_index: 1, quote: "HIDDEN-QUOTE", file: null, verified: false }],
  }),
  card("flagged", "web", { flagged: true }),
  card("private", "dotfiles"),
  card("norepo", null),
];

const report = shapeReport("Sam Rivera", ["web", "api"], owned, [
  { card_id: "a", finished_at: "2026-11-04T09:00:00Z" },
  { card_id: "a", finished_at: "2026-11-05T09:00:00Z" },
  { card_id: "private", finished_at: "2026-11-05T09:00:00Z" },
]);

test("only owned, visible, unflagged cards in ticked repos", () => {
  assert.deepEqual(
    report.repos.map((r) => [r.repo, r.decisions.map((d) => d.decision)]),
    [
      ["web", ["decision bb", "decision a"]],
      ["api", ["decision ccc"]],
    ],
  );
  assert.equal(report.owned, 3);
});

test("defended counts owned cards on the page, with the latest defense date", () => {
  assert.equal(report.defended, 1);
  const a = report.repos[0]?.decisions.find((d) => d.decision === "decision a");
  assert.equal(a?.defendedOn, "2026-11-05T09:00:00Z");
  assert.equal(a?.quote, "quote a");
  assert.equal(a?.file, "a.ts");
});

test("never the why, model_answer, answers, questions, hidden, flagged or unticked cards", () => {
  const json = JSON.stringify(report);
  for (const secret of [
    "WHY-",
    "MODEL-ANSWER-",
    "ANSWER-",
    "QUESTION-",
    "unverified",
    "HIDDEN-QUOTE",
    "hidden",
    "flagged",
    "private",
    "norepo",
    "dotfiles",
  ]) {
    assert.ok(!json.includes(secret), `report contains ${secret}`);
  }
  assert.deepEqual(Object.keys(report.repos[0]?.decisions[0] ?? {}).sort(), [
    "decision",
    "defendedOn",
    "file",
    "ownedOn",
    "quote",
  ]);
});

test("nothing ticked: an empty report with the name", () => {
  assert.deepEqual(shapeReport(null, [], owned, []), {
    name: null,
    owned: 0,
    defended: 0,
    repos: [],
  });
});
