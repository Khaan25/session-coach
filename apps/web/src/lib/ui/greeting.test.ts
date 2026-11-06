import assert from "node:assert/strict";
import { test } from "node:test";

import { greeting } from "./greeting.ts";

test("greets by the learner's local part of the day, first name only", () => {
  const at = new Date("2026-11-06T19:30:00Z");
  assert.equal(greeting("Sam Rivera", "UTC", at), "Evening, Sam");
  assert.equal(greeting("Sam Rivera", "Asia/Karachi", at), "Evening, Sam");
  assert.equal(greeting("Sam", "America/Los_Angeles", at), "Morning, Sam");
  assert.equal(
    greeting("Sam", "Europe/Berlin", new Date("2026-11-06T12:00:00Z")),
    "Afternoon, Sam",
  );
});

test("no name: the part of the day alone", () => {
  assert.equal(greeting(null, "UTC", new Date("2026-11-06T03:00:00Z")), "Evening");
  assert.equal(greeting("  ", "UTC", new Date("2026-11-06T08:00:00Z")), "Morning");
});
