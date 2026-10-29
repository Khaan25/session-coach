import assert from "node:assert/strict";
import { test } from "node:test";
import { applySessionChange, localDate, parsePage, type SessionSummary } from "./rows.ts";

const row = (id: string, status: SessionSummary["status"] = "pending"): SessionSummary => ({
  id,
  title: null,
  repo: "session-coach",
  branch: "main",
  started_at: null,
  duration_min: null,
  status,
  error: null,
  created_at: "2026-10-29T09:00:00Z",
});

test("parsePage keeps whole numbers from 1, else 1", () => {
  assert.equal(parsePage("3"), 3);
  assert.equal(parsePage(["2", "5"]), 2);
  for (const bad of [undefined, "", "0", "-1", "1.5", "abc"]) assert.equal(parsePage(bad), 1);
});

test("localDate is the learner's date, not UTC's", () => {
  const now = new Date("2026-10-29T20:00:00Z");
  assert.equal(localDate("UTC", now), "2026-10-29");
  assert.equal(localDate("Asia/Kathmandu", now), "2026-10-30");
  assert.equal(localDate("America/Los_Angeles", new Date("2026-10-29T03:00:00Z")), "2026-10-28");
  assert.equal(localDate("Not/AZone", now), "2026-10-29");
});

test("an update changes the row in place and keeps its card count", () => {
  const rows = [{ ...row("a", "processing"), cardCount: 4 }, row("b")];
  const next = applySessionChange(rows, row("a", "ready"), { prepend: true, limit: 20 });
  assert.deepEqual(
    next.map((r) => [r.id, r.status, r.cardCount]),
    [
      ["a", "ready", 4],
      ["b", "pending", undefined],
    ],
  );
});

test("an insert is prepended and cut to the limit, or ignored off page 1", () => {
  const rows = [row("a"), row("b")];
  const opts = { prepend: true, limit: 2 };
  assert.deepEqual(
    applySessionChange(rows, row("c"), opts).map((r) => r.id),
    ["c", "a"],
  );
  assert.equal(applySessionChange(rows, row("c"), { ...opts, prepend: false }), rows);
});

test("an update to an older session outside the list leaves the list alone", () => {
  const rows = [row("a"), row("b")];
  const older = { ...row("z", "ready"), created_at: "2026-10-28T09:00:00Z" };
  assert.equal(applySessionChange(rows, older, { prepend: true, limit: 20 }), rows);
  assert.deepEqual(
    applySessionChange([], older, { prepend: true, limit: 20 }).map((r) => r.id),
    ["z"],
  );
});
