#!/usr/bin/env node
import { spawn } from "node:child_process";
import { basename } from "node:path";

import pkg from "../package.json" with { type: "json" };

import { parseLoginArgs, parsePushArgs } from "./args.ts";
import {
  configPath,
  DEFAULT_URL,
  loadConfig,
  normalizeUrl,
  saveConfig,
  validateToken,
} from "./config.ts";
import {
  approveUrl,
  clientName,
  deviceStartRequest,
  interpretStart,
  openBrowser,
  pollForToken,
} from "./device.ts";
import { interpretMe, meRequest, send, unreachable } from "./http.ts";
import { parseInitArgs, parseYesNo, runInit, settingsLocalPath, stepHeading } from "./init.ts";
import { defaultProjectsDir, findLatestLog, formatSize, resolveCwd } from "./latest.ts";
import {
  failure,
  type Next,
  nextStep,
  rows,
  shellArg,
  styleFor,
  success,
  warning,
} from "./output.ts";
import { promptHidden, promptLine } from "./prompt.ts";
import { interpretProcess, interpretPut, type Outcome, validateFileName } from "./push.ts";
import { parseHookInput, readStdin, runSync } from "./sync.ts";
import { API_TIMEOUT_MS, uploadLog } from "./upload.ts";

const HELP: Record<string, string> = {
  "": `session-coach <command> [options]
Upload Claude Code sessions to Session Coach and turn them into decision cards

Getting started:
  init              Set up this project: sign in, turn on uploads, send a session
  login             Sign in on this computer

Uploading:
  push              Upload one session log
  sync              Upload finished sessions, from a Claude Code hook

Global Options:
  -h, --help        Show help
  -v, --version     Print the CLI version
  --no-color        Turn off color

Learn more: ${DEFAULT_URL}/setup`,
  init: `session-coach init [options]
Set up Session Coach for the project in this folder, one step at a time

Options:
  --no-open         Print the sign-in address instead of opening a browser
  --url <URL>       Site to sign in to (default: ${DEFAULT_URL})
  -y, --yes         Say yes to every step, for agents and scripts

Global Options: see session-coach --help

Examples:
  Set up the project in this folder:
    session-coach init
  Set up without questions:
    session-coach init --yes

Notes:
  Without a terminal and without --yes, init adds the hooks and skips every other step.`,
  login: `session-coach login [options]
Sign in on this computer by approving a code in the browser

Options:
  --no-open         Print the approve address instead of opening a browser
  --token           Paste a token from the app's /setup page instead
  --url <URL>       Site to sign in to (default: ${DEFAULT_URL})

Global Options: see session-coach --help

Examples:
  Sign in:
    session-coach login
  Sign in on a computer without a browser:
    session-coach login --no-open`,
  push: `session-coach push <file> | --latest
Upload one session log, redacted on this computer first

Arguments:
  <file>            A Claude Code log (.jsonl)

Options:
  --latest          The newest log of the project in this folder

Global Options: see session-coach --help

Examples:
  Upload the newest session of this project:
    session-coach push --latest

Notes:
  On success, stdout holds only the session ID when it isn't a terminal.`,
  sync: `session-coach sync
Upload finished sessions of this project, from a Claude Code hook

Global Options: see session-coach --help

Notes:
  Prints nothing and always exits 0; a hook's output goes into Claude's context.
  Each run writes a one-line summary to ~/.session-coach/sync.log.`,
};

const noColor = process.argv.includes("--no-color");
/** Context, progress, receipts, warnings and errors go to stderr; stdout carries only the answer. */
const err = styleFor(process.stderr, process.env, noColor);
const log = (text: string) => console.error(text);

/** Prints a failure and returns its exit code. */
function fail(headline: string, next?: Next, exitCode = 1): number {
  log(failure(err, headline, [], next));
  return exitCode;
}

/** A usage error: exit 2, pointing at the command's help. */
function usageError(command: string, problem: string): number {
  return fail(problem, { text: "See all options", command: `session-coach ${command} --help` }, 2);
}

/** The site to use: the default, or `--url` cleaned up; null when `--url` isn't a usable address. */
function siteUrl(raw: string | null): string | null {
  return raw === null ? DEFAULT_URL : normalizeUrl(raw);
}

const BAD_URL = "--url must be an https URL (http works only for localhost).";

async function login(args: string[]): Promise<number> {
  const parsed = parseLoginArgs(args);
  if ("error" in parsed) return usageError("login", parsed.error);
  const url = siteUrl(parsed.url);
  if (!url) return usageError("login", BAD_URL);

  if (!parsed.token) return deviceLogin(url, parsed.open);

  const token = await promptHidden("CLI token (from the app's /setup page): ");
  const problem = validateToken(token);
  if (problem) return fail(problem);

  const me = await send(meRequest(url, token), { timeoutMs: API_TIMEOUT_MS, retry: true });
  if ("error" in me) return fail(`${unreachable(me.error, API_TIMEOUT_MS)} Nothing was saved.`);
  const checked = interpretMe(me.status, me.body, url);
  if (checked.exitCode !== 0) return fail(checked.message);

  await saveConfig(configPath(), { token, url });
  log(success(err, checked.message, [["Saved to", configPath()]]));
  return 0;
}

const LOGIN_AGAIN: Next = { text: "Get a new code", command: "session-coach login" };

/** Login without a token to paste: approve in the browser, and the CLI collects its own token. */
async function deviceLogin(url: string, open: boolean, showNext = true): Promise<number> {
  const started = await send(deviceStartRequest(url, clientName()), {
    timeoutMs: API_TIMEOUT_MS,
    retry: false,
  });
  if ("error" in started) return fail(unreachable(started.error, API_TIMEOUT_MS));
  const start = interpretStart(started.status, started.body);
  if ("error" in start) return fail(start.error);

  const page = approveUrl(url, start.userCode);
  log(
    rows([
      ["Code", start.userCode],
      ["Approve at", page],
    ]),
  );
  log(
    open
      ? "Opening your browser. If it doesn't open, visit that address and check the code matches."
      : "Open that address in a browser where you're signed in, and check the code matches.",
  );
  if (open) openBrowser(page);
  log("Waiting for you to approve in the browser… (Ctrl+C to cancel)");

  // Ctrl+C: stop polling and leave nothing behind; the code expires on its own.
  const cancel = () => {
    log("\nStopped waiting. Nothing was saved.");
    process.exit(130);
  };
  process.once("SIGINT", cancel);
  const result = await pollForToken(url, start).finally(() => process.off("SIGINT", cancel));

  if (result.kind === "expired") {
    return fail(
      `The code expired after ${Math.round(start.expiresIn / 60)} minutes. Nothing was saved.`,
      LOGIN_AGAIN,
    );
  }
  if (result.kind === "denied")
    return fail("The login was denied in the browser. Nothing was saved.");
  if (result.kind === "error") return fail(`${result.message} Nothing was saved.`, LOGIN_AGAIN);

  await saveConfig(configPath(), { token: result.token, url });
  const who = result.email ? `Signed in as ${result.email}` : `Signed in to ${url}`;
  log(success(err, who, [["Saved to", configPath()]]));
  if (showNext) {
    log(
      `\n${nextStep(err, { text: "Turn on automatic uploads in each project", command: "session-coach init" })}`,
    );
  }
  return 0;
}

async function push(args: string[]): Promise<number> {
  const parsed = parsePushArgs(args);
  if ("error" in parsed) return usageError("push", parsed.error);

  if ("latest" in parsed) {
    const cwd = resolveCwd(process.env, process.cwd());
    // Inside Claude Code (an agent running the setup prompt) the newest log is the session still running: skip logs
    // written in the last minute, so the first upload is a finished session, not a half-written one.
    const runningSince = process.env.CLAUDECODE ? Date.now() - 60_000 : Infinity;
    const found = await findLatestLog(defaultProjectsDir(), cwd, runningSince);
    if ("error" in found) return fail(found.error);
    const problem = validateFileName(found.name);
    if (problem) return fail(`${found.path}: ${problem}`);
    log(`Uploading ${found.name} (${formatSize(found.size)})…`);
    return pushFile(found.path, "session-coach push --latest");
  }
  return pushFile(parsed.file, `session-coach push ${shellArg(parsed.file)}`);
}

/**
 * Uploads one log and prints the receipt. On success with `printId`, a stdout that isn't a terminal gets the session
 * ID alone, so `id=$(session-coach push --latest)` works.
 *
 * @param rerun - The command that runs this upload again, offered when that's the way out of a failure.
 */
async function pushFile(file: string, rerun: string, printId = true): Promise<number> {
  const nameProblem = validateFileName(file);
  if (nameProblem) return fail(nameProblem);

  const config = await loadConfig(configPath());
  if (!config)
    return fail("You're not signed in.", { text: "Sign in", command: "session-coach login" });

  const uploaded = await uploadLog(file, basename(file), config);
  if (uploaded.kind === "unreadable") return fail(`Couldn't read ${file}.`);
  if (uploaded.kind === "too_big") return fail("Can't upload a log over 50 MB.");
  if (uploaded.kind === "unreachable") return fail(unreachable(uploaded.error, uploaded.timeoutMs));
  let outcome: Outcome;
  if (uploaded.kind === "not_created") outcome = uploaded.result;
  else if (uploaded.kind === "not_stored") outcome = interpretPut(uploaded.status);
  else {
    const { status, body, retryAfter } = uploaded.answer;
    outcome = interpretProcess(status, body, uploaded.id, retryAfter);
  }

  const ids: [string, string][] = outcome.id ? [["Session ID", outcome.id]] : [];
  if (outcome.exitCode !== 0) {
    const next =
      outcome.next ?? (outcome.retry ? { text: "Upload it again", command: rerun } : undefined);
    log(failure(err, outcome.message, ids, next));
    return outcome.exitCode;
  }
  // A no-op isn't a completed result, so it gets no ✓.
  log(
    outcome.unchanged
      ? [outcome.message, rows(ids)].join("\n")
      : success(err, outcome.message, ids),
  );
  if (printId && outcome.id && !process.stdout.isTTY) console.log(outcome.id);
  return 0;
}

/** Carries a SessionEnd hook's stdin to the detached process that does the upload. */
const HOOK_INPUT_ENV = "SESSION_COACH_HOOK_INPUT";

/**
 * For a SessionStart or SessionEnd hook: its stdout goes into Claude's context, so this prints nothing, always exits 0, and exits
 * itself because an upload cut off by the deadline would otherwise keep the process alive.
 */
async function sync(): Promise<never> {
  try {
    const handedOver = process.env[HOOK_INPUT_ENV];
    const stdin = handedOver ?? (process.stdin.isTTY ? null : await readStdin(process.stdin));
    // Claude Code may be quitting at SessionEnd, so the upload goes on in a detached copy of this process and the hook
    // returns at once.
    if (handedOver === undefined && parseHookInput(stdin).ended) {
      spawn(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
        detached: true,
        stdio: "ignore",
        env: { ...process.env, [HOOK_INPUT_ENV]: stdin ?? "" },
      }).unref();
      process.exit(0);
    }
    await runSync({ stdin, env: process.env, cwd: process.cwd() });
  } catch {
    // runSync reports its own failures to sync.log; nothing may reach stdout or stderr
  }
  process.exit(0);
}

const INIT_STEPS = 4;

/**
 * `init`: the guided first run. One step at a time, each explained before it happens, and nothing changes without a
 * yes (or `--yes`, for agents and scripts). Without a terminal and without --yes, every question is a no.
 */
async function init(args: string[]): Promise<number> {
  const parsed = parseInitArgs(args);
  if ("error" in parsed) return usageError("init", parsed.error);
  const chosen = siteUrl(parsed.url);
  if (!chosen) return usageError("init", BAD_URL);
  let url = chosen;

  // Without a terminal (an agent running the setup prompt), running init is the yes for the hooks, the step init
  // exists for; every other question is a no, so nothing is uploaded unasked.
  const ask = async (question: string, noTerminal = false): Promise<boolean> => {
    if (parsed.yes) {
      log(`${question} yes (--yes)`);
      return true;
    }
    if (!process.stdin.isTTY) {
      log(
        noTerminal
          ? `${question} yes (no terminal: running init means yes to the hooks)`
          : `${question} skipped: there's no terminal to answer in. Run session-coach init --yes to say yes to every step.`,
      );
      return noTerminal;
    }
    for (;;) {
      const line = await promptLine(`${question} [Y/n] `);
      // Ctrl-D or Ctrl-C is a no, never the default.
      if (line === null) return false;
      const answer = parseYesNo(line, true);
      if (answer !== null) return answer;
    }
  };

  log(
    "Set up Session Coach for this project in 4 steps. In a terminal, nothing changes without a yes.",
  );

  log(stepHeading(1, INIT_STEPS, "Sign in"));
  const saved = await loadConfig(configPath());
  let signedIn = false;
  if (saved && (parsed.url === null || saved.url === url)) {
    url = saved.url;
    const me = await send(meRequest(url, saved.token), { timeoutMs: API_TIMEOUT_MS, retry: true });
    if (!("error" in me)) {
      const checked = interpretMe(me.status, me.body, url);
      if (checked.exitCode === 0) {
        log(`${checked.message} Nothing to do.`);
        signedIn = true;
      }
    }
  }
  if (!signedIn) {
    log(
      "Your browser opens a page with a code. Check it matches the one here, then click Approve. There's no token to copy.",
    );
    const code = await deviceLogin(url, parsed.open, false);
    if (code !== 0) return code;
  }

  log(stepHeading(2, INIT_STEPS, "Turn on automatic uploads for this project"));
  const cwd = resolveCwd(process.env, process.cwd());
  log(
    [
      "Two hooks in this project's .claude/settings.local.json (your personal settings, kept out of git) run `session-coach sync`:",
      "SessionEnd uploads a session as it ends; SessionStart catches up on any it missed. Both print nothing; SessionEnd holds Claude Code's exit only while it hands off the upload, a second or two.",
      "Secrets are removed on your laptop before upload, as best it can; only turn this on for projects you're happy to send.",
    ].join("\n"),
  );
  if (await ask(`Add the hooks to ${settingsLocalPath(cwd)}?`, true)) {
    const result = await runInit(cwd, pkg.version);
    if (result.exitCode !== 0) return fail(result.message);
    log(success(err, result.message, [["Hooks added to", settingsLocalPath(cwd)]]));
    for (const text of result.warnings) log(warning(err, text));
  } else log("Skipped. Upload by hand with session-coach push --latest.");

  log(stepHeading(3, INIT_STEPS, "Send your newest session"));
  const found = await findLatestLog(defaultProjectsDir(), cwd);
  if ("error" in found) {
    log(
      `${found.error}\nThat's fine: finish a Claude Code session in this folder and it uploads when it ends.`,
    );
  } else if (await ask(`Upload ${found.name} (${formatSize(found.size)}) now?`)) {
    const code = await pushFile(found.path, "session-coach push --latest", false);
    if (code !== 0)
      log("The upload didn't go through; the hook catches it up on your next session start.");
  } else log("Skipped. The hook sends it later, or run session-coach push --latest.");

  log(stepHeading(4, INIT_STEPS, "What happens next"));
  log(
    [
      `1. Within a few minutes, up to 5 decision cards from each session appear at ${url}/dashboard.`,
      "2. Explain each decision in your own words. A card comes back on day 1, 4 and 11 until you own it.",
      "3. Defend any card you've explained, whenever you want harder practice.",
      "",
      nextStep(err, { text: "Turn it on in another project", command: "session-coach init" }),
    ].join("\n"),
  );
  return 0;
}

async function main(argv: string[]): Promise<number> {
  const [command = "", ...args] = argv.filter((arg) => arg !== "--no-color");
  // Help and version work before any config or network, and do no work.
  if (command === "help") {
    const topic = args[0] ?? "";
    if (!Object.hasOwn(HELP, topic)) return unknownCommand(topic);
    console.log(HELP[topic]);
    return 0;
  }
  if (command === "--help" || command === "-h" || command === "") {
    console.log(HELP[""]);
    return 0;
  }
  if (command === "--version" || command === "-v" || args.includes("--version")) {
    console.log(pkg.version);
    return 0;
  }
  if (!Object.hasOwn(HELP, command)) return unknownCommand(command);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP[command]);
    return 0;
  }
  if (command === "init") return init(args);
  if (command === "login") return login(args);
  if (command === "push") return push(args);
  return sync();
}

function unknownCommand(command: string): number {
  return fail(
    `Unknown command ${command} for session-coach.`,
    { text: "See all commands", command: "session-coach --help" },
    2,
  );
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    // Error messages here come from our own code or Node's fs; none carry the token.
    const detail = error instanceof Error ? error.message : String(error);
    log(failure(err, "Unexpected error in session-coach. This is a bug.", [["Error", detail]]));
    process.exitCode = 1;
  },
);
