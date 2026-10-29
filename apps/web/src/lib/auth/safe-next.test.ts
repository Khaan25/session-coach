import assert from "node:assert/strict";
import { test } from "node:test";
import { safeNext } from "./safe-next.ts";

const origin = "https://coach.example.com";

test("keeps same-origin paths with their query and hash", () => {
  assert.equal(safeNext("/x", origin), "/x");
  assert.equal(safeNext("/s/abc?tab=cards#c2", origin), "/s/abc?tab=cards#c2");
  assert.equal(safeNext(`${origin}/review`, origin), "/review");
});

test("falls back to /dashboard for other origins", () => {
  assert.equal(safeNext("//evil.com", origin), "/dashboard");
  assert.equal(safeNext("/\\evil.com", origin), "/dashboard");
  assert.equal(safeNext("https://evil.com", origin), "/dashboard");
  assert.equal(safeNext("https://evil.com/dashboard", origin), "/dashboard");
  assert.equal(safeNext("javascript:alert(1)", origin), "/dashboard");
});

test("falls back to /dashboard when dot segments normalise to a protocol-relative path", () => {
  for (const next of ["/.//evil.com", "/..//evil.com", "/x/..//evil.com", "/./\\evil.com"]) {
    assert.equal(safeNext(next, origin), "/dashboard", next);
  }
});

test("falls back to /dashboard when tabs or newlines hide a protocol-relative path", () => {
  for (const next of ["/\t/evil.com", "\t//evil.com", "/\n/evil.com", "/\r\n/evil.com"]) {
    assert.equal(safeNext(next, origin), "/dashboard", JSON.stringify(next));
  }
});

test("falls back to /dashboard when next is missing", () => {
  assert.equal(safeNext("", origin), "/dashboard");
  assert.equal(safeNext(null, origin), "/dashboard");
  assert.equal(safeNext(undefined, origin), "/dashboard");
});
