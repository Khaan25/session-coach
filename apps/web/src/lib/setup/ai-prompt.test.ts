import assert from "node:assert/strict";
import { test } from "node:test";

import { AGENT_NAMES, setupPrompt } from "./ai-prompt.ts";
import type { SetupAgent } from "./ai-prompt.ts";

const agents = Object.keys(AGENT_NAMES) as SetupAgent[];

test("every prompt logs in through the browser and pushes the latest session", () => {
  for (const agent of agents) {
    const prompt = setupPrompt(agent);
    assert.match(prompt, /npx session-coach@latest login/u);
    assert.match(prompt, /push --latest/u);
  }
});

test("no prompt holds a token or a token-shaped value", () => {
  for (const agent of agents) {
    const prompt = setupPrompt(agent);
    assert.doesNotMatch(prompt, /sc_[A-Za-z0-9_-]/u);
    assert.doesNotMatch(prompt, /--token/u);
  }
});

test("only Claude Code turns on auto-upload, through init", () => {
  assert.match(setupPrompt("claude"), /npx session-coach@latest init/u);
  for (const agent of agents.filter((a) => a !== "claude")) {
    assert.doesNotMatch(setupPrompt(agent), /init|sync/u);
  }
});
