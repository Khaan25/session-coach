import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { decisionCardSchema, getEvidenceFlags } from "./decision.ts";
import { sessionSchema } from "./session.ts";

const fixture = JSON.parse(readFileSync(new URL("../fixtures/session.sample.json", import.meta.url), "utf8"));

test("sample fixture matches the shared schemas", () => {
  sessionSchema.parse(fixture.session);
  for (const card of fixture.cards) decisionCardSchema.parse(card);
});

test("flagged and hidden follow the evidence check", () => {
  assert.deepEqual(getEvidenceFlags([{ verified: true }]), { flagged: false, hidden: false });
  assert.deepEqual(getEvidenceFlags([{ verified: true }, { verified: false }]), { flagged: true, hidden: false });
  assert.deepEqual(getEvidenceFlags([{ verified: false }]), { flagged: true, hidden: true });
});

test("fixture cards agree with getEvidenceFlags", () => {
  for (const card of fixture.cards) {
    assert.deepEqual(getEvidenceFlags(card.evidence), { flagged: card.flagged, hidden: card.hidden }, card.id);
  }
});
