import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseProjectScope,
  projectHref,
  projectLabel,
  projectMatches,
  projectScope,
} from "./scope.ts";

test("project scopes distinguish repositories from reserved labels and missing metadata", () => {
  assert.equal(projectScope("all"), "repo:all");
  assert.equal(projectScope("unassigned"), "repo:unassigned");
  assert.equal(projectScope(null), "unassigned");
  assert(projectMatches("org/a", "repo:org/a"));
  assert(!projectMatches("org/b", "repo:org/a"));
  assert(projectMatches("", "unassigned"));
  assert(projectMatches(null, "all"));
});
test("project URL state round trips full repository names without losing other context", () => {
  const scope = "repo:org/learning & research";
  const href = projectHref("/review/card?from=session#result", scope);
  const url = new URL(href, "http://localhost");
  assert.equal(parseProjectScope(url.searchParams.get("project")), scope);
  assert.equal(url.searchParams.get("from"), "session");
  assert.equal(url.hash, "#result");
  assert.equal(projectHref(href, "all"), "/review/card?from=session#result");
  assert.equal(projectLabel("repo:org/a"), "org/a");
});
test("invalid and repeated project values use a safe stable scope", () => {
  assert.equal(parseProjectScope(["repo:a", "repo:b"]), "repo:a");
  for (const value of [
    null,
    undefined,
    "",
    "repo:",
    "other",
    "repo:a\u0000b",
    `repo:${"a".repeat(201)}`,
  ])
    assert.equal(parseProjectScope(value), "all");
});
