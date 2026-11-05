// `session-coach init`: a guided first run, one step at a time (sign in, the sync hook, the first upload, what comes
// next). The parts that decide anything are pure, so node --test covers them without a terminal; cli.ts does the I/O.

/**
 * The CLI version the hook runs. Pinned, as packages/cli/README.md explains, so a session start never runs whatever
 * is newest on npm. shortcut: a literal, raise it with each release that changes `sync`.
 */
export const HOOK_VERSION = "0.3.0";

export type InitArgs = { url: string | null; yes: boolean } | { error: string };

/** Accepts `--url value`, `--url=value` and `--yes` (say yes to every step, for agents and scripts). */
export function parseInitArgs(args: string[]): InitArgs {
  let url: string | null = null;
  let yes = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string;
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
  return { url, yes };
}

/** The hook's command, exactly as packages/cli/README.md documents it. */
export function syncHookCommand(version: string = HOOK_VERSION): string {
  return `npx --yes session-coach@${version} sync`;
}

export type HookEdit =
  | { kind: "added"; text: string }
  | { kind: "present" }
  | { kind: "invalid"; reason: string };

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** True when a SessionStart group already runs `session-coach … sync`, at any version. */
function hasSyncHook(groups: unknown[]): boolean {
  return groups.some(
    (group) =>
      isObject(group) &&
      Array.isArray(group.hooks) &&
      group.hooks.some(
        (hook) =>
          isObject(hook) &&
          typeof hook.command === "string" &&
          /\bsession-coach(@\S+)?\s+sync\b/.test(hook.command),
      ),
  );
}

/**
 * Adds the sync hook to a project's `.claude/settings.json` text, keeping every other setting and hook as it was.
 * Never guesses at a file it can't read as a settings object: that comes back `invalid` and the file is left alone.
 *
 * @param text - The file's contents, or null when there is no file yet.
 * @returns The new text to write, `present` when the hook is already there, or `invalid` with a reason.
 */
export function addSyncHook(text: string | null, version: string = HOOK_VERSION): HookEdit {
  let settings: unknown = {};
  if (text !== null && text.trim() !== "") {
    try {
      settings = JSON.parse(text);
    } catch {
      return { kind: "invalid", reason: "it isn't valid JSON" };
    }
  }
  if (!isObject(settings)) return { kind: "invalid", reason: "it isn't a JSON object" };

  const hooks = settings.hooks ?? {};
  if (!isObject(hooks)) return { kind: "invalid", reason: '"hooks" isn\'t an object' };
  const start = hooks.SessionStart ?? [];
  if (!Array.isArray(start))
    return { kind: "invalid", reason: '"hooks.SessionStart" isn\'t a list' };
  if (hasSyncHook(start)) return { kind: "present" };

  const group = {
    matcher: "startup|resume|clear",
    hooks: [{ type: "command", command: syncHookCommand(version), async: true }],
  };
  const next = { ...settings, hooks: { ...hooks, SessionStart: [...start, group] } };
  return { kind: "added", text: `${JSON.stringify(next, null, 2)}\n` };
}

/** A step heading: `Step 2 of 4 · Turn on automatic uploads`. */
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
