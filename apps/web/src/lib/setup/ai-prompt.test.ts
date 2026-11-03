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

test("only Claude Code gets the SessionEnd hook, scoped to this project, skipping short sessions", () => {
  const claude = setupPrompt("claude");
  assert.match(claude, /SessionEnd hook for this project only/);
  assert.match(claude, /\.claude\/settings\.local\.json/);
  assert.match(claude, /under 5 minutes/);
  for (const agent of agents.filter((a) => a !== "claude")) {
    assert.doesNotMatch(setupPrompt(agent), /SessionEnd/);
  }
});
