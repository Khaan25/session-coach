// `session-coach init`: turns on auto-upload for the project in the current folder by adding the sync hooks to its
// `.claude/settings.local.json`, Claude Code's personal, uncommitted settings file. `addSyncHooks` is pure, so
// node --test covers the merge.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/** The two hooks: SessionEnd uploads a session as it ends; SessionStart catches up on any that one missed. */
export function syncHooks(version: string) {
  const command = `npx --yes session-coach@${version} sync`;
  return {
    SessionStart: {
      matcher: "startup|resume|clear",
      hooks: [{ type: "command", command, async: true }],
    },
    SessionEnd: { hooks: [{ type: "command", command, async: true }] },
  };
}

const OUR_COMMAND = /\bsession-coach(@\S+)? sync\b/;

type HookGroup = { hooks?: { command?: unknown }[] };

/** Whether a hook group is one of ours, from any version. */
function isOurs(group: unknown): boolean {
  const hooks = (group as HookGroup | null)?.hooks;
  return (
    Array.isArray(hooks) &&
    hooks.some((hook) => typeof hook?.command === "string" && OUR_COMMAND.test(hook.command))
  );
}

/**
 * Settings with our hooks added, and any older session-coach sync hooks replaced, so running init again (or after an
 * upgrade) leaves exactly one of each. Every other setting and hook is kept as it was.
 *
 * @param settings - The parsed settings file, or `{}` when there is none.
 * @param version - The CLI version the hooks pin.
 * @returns The new settings, or an error when the file's `hooks` isn't the shape Claude Code uses.
 */
export function addSyncHooks(
  settings: Record<string, unknown>,
  version: string,
): Record<string, unknown> | { error: string } {
  const hooks = settings.hooks ?? {};
  if (typeof hooks !== "object" || hooks === null || Array.isArray(hooks)) {
    return { error: '"hooks" in the settings file is not an object, so nothing was changed.' };
  }
  const next: Record<string, unknown> = { ...hooks };
  for (const [event, group] of Object.entries(syncHooks(version))) {
    const groups = next[event] ?? [];
    if (!Array.isArray(groups)) {
      return {
        error: `"hooks.${event}" in the settings file is not a list, so nothing was changed.`,
      };
    }
    next[event] = [...groups.filter((g) => !isOurs(g)), group];
  }
  return { ...settings, hooks: next };
}

/** Whether a settings file already holds a session-coach sync hook, so init can warn about running it twice. */
export function hasSyncHook(settings: Record<string, unknown>): boolean {
  const hooks = settings.hooks;
  if (typeof hooks !== "object" || hooks === null) return false;
  return Object.values(hooks).some((groups) => Array.isArray(groups) && groups.some(isOurs));
}

/** Reads a JSON settings file: `{}` when it doesn't exist, an error when it isn't a JSON object. */
async function readSettings(path: string): Promise<Record<string, unknown> | { error: string }> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    return { error: `Couldn't read ${path}.` };
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // reported below
  }
  return {
    error: `${path} isn't a JSON object, so nothing was changed. Fix it and run init again.`,
  };
}

/**
 * Adds the hooks to `<cwd>/.claude/settings.local.json`.
 *
 * @returns What to print and the exit code.
 */
export async function runInit(
  cwd: string,
  version: string,
): Promise<{ message: string; exitCode: number }> {
  const path = join(cwd, ".claude", "settings.local.json");
  const current = await readSettings(path);
  if ("error" in current) return { message: current.error as string, exitCode: 1 };
  const updated = addSyncHooks(current, version);
  if ("error" in updated) return { message: `${path}: ${updated.error as string}`, exitCode: 1 };

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(updated, null, 2)}\n`);

  const lines = [
    `Auto-upload is on for ${cwd}.`,
    `Added the session-coach hooks to ${path} (your personal settings; keep it out of git).`,
    "Each session in this project now uploads when it ends. Run session-coach init in other projects to add them.",
  ];
  const shared = await readSettings(join(cwd, ".claude", "settings.json"));
  if (!("error" in shared) && hasSyncHook(shared)) {
    lines.push(
      "Note: .claude/settings.json also has a session-coach hook. Remove it there, so teammates don't run it too.",
    );
  }
  return { message: lines.join("\n"), exitCode: 0 };
}
