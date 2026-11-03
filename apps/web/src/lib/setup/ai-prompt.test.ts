import assert from "node:assert/strict";
import { test } from "node:test";

import { AGENT_NAMES, setupPrompt, type SetupAgent } from "./ai-prompt.ts";

const agents = Object.keys(AGENT_NAMES) as SetupAgent[];

test("every prompt logs in through the browser and pushes the latest session", () => {
  for (const agent of agents) {
    const prompt = setupPrompt(agent);
    assert.match(prompt, /npx session-coach@latest login/);
    assert.match(prompt, /push --latest/);
  }
});

test("no prompt holds a token or a token-shaped value", () => {
  for (const agent of agents) {
    const prompt = setupPrompt(agent);
    assert.doesNotMatch(prompt, /sc_[A-Za-z0-9_-]/);
    assert.doesNotMatch(prompt, /--token/);
  }
});

test("only Claude Code gets the sync hook, in this project's settings, pinned and async", () => {
  const claude = setupPrompt("claude");
  assert.match(claude, /"SessionStart"/);
  assert.match(claude, /project's \.claude\/settings\.json/);
  assert.match(claude, /session-coach@0\.2\.0 sync","async":true/);
  assert.doesNotThrow(() => JSON.parse(claude.match(/\{"hooks".*\}/)?.[0] ?? ""));
  for (const agent of agents.filter((a) => a !== "claude")) {
    assert.doesNotMatch(setupPrompt(agent), /SessionStart|sync/);
  }
});
