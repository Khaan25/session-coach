import assert from "node:assert/strict";
import { test } from "node:test";

import { cleanPromptTitle, sessionName } from "./name.ts";

test("sessionName prefers the title, then repo and branch, then a fallback", () => {
  assert.equal(sessionName({ title: "Write parser", repo: "r", branch: "b" }), "Write parser");
  assert.equal(
    sessionName({ title: null, repo: "rapporteur", branch: "main" }),
    "rapporteur on main",
  );
  assert.equal(sessionName({ title: "", repo: "rapporteur", branch: null }), "rapporteur");
  assert.equal(sessionName({}), "Untitled session");
});

test("cleanPromptTitle removes a drop-set tag with its contents", () => {
  assert.equal(cleanPromptTitle("<system-reminder>rules and more rules</system-reminder>"), "");
  assert.equal(cleanPromptTitle("<command-name>/clear</command-name>"), "");
});

test("cleanPromptTitle removes several leading tags and keeps the prompt", () => {
  const text =
    "<local-command-caveat>careful</local-command-caveat>\n<command-name>/clear</command-name> Fix  the\nlogin bug";
  assert.equal(cleanPromptTitle(text), "Fix the login bug");
});

test("cleanPromptTitle unwraps a closed pasted_content and keeps its text", () => {
  assert.equal(
    cleanPromptTitle(
      '<pasted_content id="2bab"> Plan only. Do not edit any file.</pasted_content>',
    ),
    "Plan only. Do not edit any file.",
  );
});

test("cleanPromptTitle keeps the text after an unclosed pasted_content", () => {
  assert.equal(
    cleanPromptTitle(
      '<pasted_content id="2bab"> Plan only. Do not edit any file, do not commit, never…',
    ),
    "Plan only. Do not edit any file, do not commit, never…",
  );
});

test("cleanPromptTitle leaves other tags alone, at the start and in the middle", () => {
  assert.equal(
    cleanPromptTitle('<div class="x"> why is this broken?'),
    '<div class="x"> why is this broken?',
  );
  assert.equal(cleanPromptTitle("fix the <div> bug"), "fix the <div> bug");
});

test("cleanPromptTitle empties an unclosed drop-set tag", () => {
  assert.equal(cleanPromptTitle("<system-reminder>some text"), "");
});

test("cleanPromptTitle gives the same result when run twice", () => {
  for (const text of [
    '<pasted_content id="2bab"> Plan only. Do not edit…',
    "<system-reminder>a</system-reminder><pasted_content>  hi   there</pasted_content>",
    '<div class="x"> why is this broken?',
    "<system-reminder>some text",
    "plain  text",
  ]) {
    const once = cleanPromptTitle(text);
    assert.equal(cleanPromptTitle(once), once);
  }
});

test("sessionName cleans a saved title and falls back when nothing is left", () => {
  assert.equal(
    sessionName({ title: '<pasted_content id="2bab"> Plan only. Do not edit…', repo: "r" }),
    "Plan only. Do not edit…",
  );
  assert.equal(
    sessionName({ title: "<system-reminder>some text", repo: "coach", branch: "main" }),
    "coach on main",
  );
  assert.equal(sessionName({ title: "<system-reminder>some text" }), "Untitled session");
});
