// `session-coach init`: turns on auto-upload for the project in the current folder by adding the sync hooks to its
// `.claude/settings.local.json`, Claude Code's personal, uncommitted settings file. `addSyncHooks` is pure, so
// node --test covers the merge.

import { execFile } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

/**
 * The two hooks: SessionEnd uploads a session as it ends; SessionStart catches up on any that one missed.
 * SessionEnd isn't async: `claude -p` kills async hooks still running at teardown, which can land before `sync` has
 * started its detached copy. Claude Code waits only for that handoff; `timeout` raises the SessionEnd budget (1.5 s by
 * default) so a slow `npx` start isn't cut off.
 */
export function syncHooks(version: string) {
  const command = `npx --yes session-coach@${version} sync`;
  return {
    SessionStart: {
      matcher: "startup|resume|clear",
      hooks: [{ type: "command", command, async: true }],
    },
    SessionEnd: { hooks: [{ type: "command", command, timeout: 30 }] },
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

const SETTINGS_LOCAL = ".claude/settings.local.json";

/**
 * Whether git ignores `.claude/settings.local.json` in `cwd`: true or false in a git repo, null outside one or
 * without git, where there is nothing to commit it to.
 */
export async function settingsLocalIgnored(cwd: string): Promise<boolean | null> {
  try {
    await promisify(execFile)("git", ["check-ignore", "-q", SETTINGS_LOCAL], { cwd });
    return true;
  } catch (err) {
    // check-ignore exits 1 for a path that isn't ignored and 128 outside a repo; ENOENT means no git.
    return (err as { code?: unknown }).code === 1 ? false : null;
  }
}

/**
 * Adds the hooks to `<cwd>/.claude/settings.local.json`, and warns when git would commit that file.
 *
 * @returns What to print, any warnings, and the exit code.
 */
export async function runInit(
  cwd: string,
  version: string,
): Promise<{ message: string; warnings: string[]; exitCode: number }> {
  const path = join(cwd, ".claude", "settings.local.json");
  const current = await readSettings(path);
  if ("error" in current) return { message: current.error as string, warnings: [], exitCode: 1 };
  const updated = addSyncHooks(current, version);
  if ("error" in updated)
    return { message: `${path}: ${updated.error as string}`, warnings: [], exitCode: 1 };

  await mkdir(dirname(path), { recursive: true });
  // Written beside it, then renamed over it, so an interrupted write never leaves half a settings file.
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(updated, null, 2)}\n`);
  await rename(temporary, path);

  const warnings: string[] = [];
  if ((await settingsLocalIgnored(cwd)) === false) {
    warnings.push(
      `git doesn't ignore ${SETTINGS_LOCAL} in this project, so it could be committed and the hooks would run for teammates. Add this line to .gitignore:\n    ${SETTINGS_LOCAL}`,
    );
  }
  const shared = await readSettings(join(cwd, ".claude", "settings.json"));
  if (!("error" in shared) && hasSyncHook(shared)) {
    warnings.push(
      ".claude/settings.json also has a session-coach hook, so teammates run it too. Remove it there.",
    );
  }
  return {
    message: `Auto-upload is on for ${cwd}. Each session here uploads when it ends.`,
    warnings,
    exitCode: 0,
  };
}

/** Where init writes the hooks: Claude Code's personal, uncommitted settings for the project. */
export function settingsLocalPath(cwd: string): string {
  return join(cwd, ".claude", "settings.local.json");
}

export type InitArgs = { url: string | null; yes: boolean; open: boolean } | { error: string };

/**
 * Accepts `--url value`, `--url=value`, `--yes` (say yes to every step, for agents and scripts) and `--no-open`
 * (print the login address without opening a browser).
 */
export function parseInitArgs(args: string[]): InitArgs {
  let url: string | null = null;
  let yes = false;
  let open = true;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string;
    if (arg === "--no-open") {
      if (!open) return { error: "--no-open was given twice." };
      open = false;
      continue;
    }
    if (arg === "--yes" || arg === "-y") {
      if (yes) return { error: "--yes was given twice." };
      yes = true;
      continue;
    }
    let value: string | undefined;
    if (arg === "--url") {
      value = args[++i];
      if (value === undefined) return { error: "--url needs a value." };
    } else if (arg.startsWith("--url=")) {
      value = arg.slice("--url=".length);
    } else {
      return { error: `Unknown argument: ${arg}` };
    }
    if (url !== null) return { error: "--url was given twice." };
    url = value;
  }
  return { url, yes, open };
}

/** A step heading: `Step 2 of 4 · Turn on automatic uploads`, after a blank line that separates phases. */
export function stepHeading(step: number, total: number, title: string): string {
  return `\nStep ${step} of ${total} · ${title}`;
}

/** Reads a yes/no answer. Empty means the default; anything not starting with y or n is asked again (null). */
export function parseYesNo(answer: string, defaultYes: boolean): boolean | null {
  const a = answer.trim().toLowerCase();
  if (a === "") return defaultYes;
  if (a.startsWith("y")) return true;
  if (a.startsWith("n")) return false;
  return null;
}
