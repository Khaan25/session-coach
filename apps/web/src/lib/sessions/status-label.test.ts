import assert from "node:assert/strict";
import { test } from "node:test";
import { isEmptyReady, NO_DECISIONS, sessionLabel } from "./status-label.ts";

test("ready with 0 cards says no decisions were found", () => {
  assert.equal(sessionLabel("ready", 0), NO_DECISIONS);
  assert.equal(sessionLabel("ready", 0, { ready: "Cards ready" }), NO_DECISIONS);
});

test("ready with cards keeps the ready word", () => {
  for (const count of [1, 5]) {
    assert.equal(sessionLabel("ready", count), "Ready");
    assert.equal(sessionLabel("ready", count, { ready: "Cards ready" }), "Cards ready");
  }
});

test("ready with an unknown count is not called empty", () => {
  assert.equal(sessionLabel("ready"), "Ready");
  assert.equal(sessionLabel("ready", undefined, { ready: "Cards ready" }), "Cards ready");
});

test("processing, pending and failed never change, whatever the count", () => {
  for (const count of [undefined, 0, 3]) {
    assert.equal(sessionLabel("processing", count), "Making cards");
    assert.equal(sessionLabel("pending", count), "Queued");
    assert.equal(sessionLabel("failed", count), "Failed");
  }
});

test("isEmptyReady is true only for ready with a count of 0", () => {
  assert.equal(isEmptyReady("ready", 0), true);
  assert.equal(isEmptyReady("ready", 1), false);
  assert.equal(isEmptyReady("ready"), false);
  assert.equal(isEmptyReady("processing", 0), false);
  assert.equal(isEmptyReady("failed", 0), false);
});
