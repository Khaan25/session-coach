// The "Set up with your AI" prompts on /setup. Pure, so node --test checks them. A prompt never holds a token: the
// agent runs `login`, which the learner approves in the browser.

/** The agents /setup has a tab for. Only Claude Code gets the auto-upload hook: the CLI reads Claude Code logs. */
export type SetupAgent = "claude" | "codex" | "gemini" | "cursor";

export const AGENT_NAMES: Record<SetupAgent, string> = {
  claude: "Claude Code",
  codex: "Codex",
  gemini: "Gemini CLI",
  cursor: "Cursor",
};

const LOGIN = `1. Run: npx session-coach@latest login
   It prints a code and opens my browser. Wait while I check the code and approve; carry on only after it prints "Signed in".`;

const HOOK = `2. Add a SessionEnd hook for this project only, in .claude/settings.local.json (merge with what is there), so each
   Claude Code session uploads when it ends:
   - The hook reads transcript_path from its JSON stdin and runs: npx session-coach@latest push "<transcript_path>"
   - Skip sessions under 5 minutes: compare the first and last timestamp in the transcript and exit 0 if shorter.
   - Run the upload in the background so the hook returns at once.`;

const RULES = `Never ask me for a token and never paste one into this chat; sign-in happens in the browser.`;

/**
 * The prompt the learner pastes into `agent`.
 *
 * @param agent - Which tab.
 */
export function setupPrompt(agent: SetupAgent): string {
  if (agent === "claude") {
    return `Set up Session Coach for me.
${LOGIN}
${HOOK}
3. Run: npx session-coach@latest push --latest  and show me the result.
${RULES}`;
  }
  return `Set up Session Coach for me. It turns my Claude Code sessions into review cards.
${LOGIN}
2. Run: npx session-coach@latest push --latest  in this folder and show me the result. It uploads the latest
   Claude Code session for this folder; ${AGENT_NAMES[agent]} sessions aren't read yet.
${RULES}`;
}
