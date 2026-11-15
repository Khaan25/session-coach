import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { cards, session } from "./sample.ts";

const loadFixture = async () =>
  JSON.parse(
    await readFile(
      new URL("../../../../../packages/shared/fixtures/session.sample.json", import.meta.url),
      "utf8",
    ),
  );

const pick = (row: Record<string, unknown>, keys: string[]) =>
  Object.fromEntries(keys.map((key) => [key, row[key]]));

test("the gallery's session matches the fixture", async () => {
  const fixture = await loadFixture();
  assert.deepEqual(session, pick(fixture.session, Object.keys(session)));
});

test("the gallery's cards are the fixture's visible cards, without the answer key", async () => {
  const fixture = await loadFixture();
  const visible = fixture.cards.filter((card: { hidden: boolean }) => !card.hidden);
  assert.equal(cards.length, visible.length);
  for (const [index, card] of cards.entries()) {
    assert.ok(!("model_answer" in card));
    assert.deepEqual(card, pick(visible[index], Object.keys(card)));
  }
});
