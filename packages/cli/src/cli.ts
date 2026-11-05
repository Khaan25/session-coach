#!/usr/bin/env node
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

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
import { addSyncHook, parseInitArgs, parseYesNo, stepHeading } from "./init.ts";
import { defaultProjectsDir, findLatestLog, formatSize, resolveCwd } from "./latest.ts";
import { promptHidden, promptLine } from "./prompt.ts";
import { interpretProcess, interpretPut, validateFileName } from "./push.ts";
import { readStdin, runSync } from "./sync.ts";
import { API_TIMEOUT_MS, uploadLog } from "./upload.ts";

const USAGE = `Usage:
  session-coach init [--url <site url>] [--yes]   first time here? start with this
  session-coach login [--url <site url>] [--token]
  session-coach push <file.jsonl>
  session-coach push --latest
  session-coach sync`;

/** Prints a message and returns the exit code. */
function say(message: string, exitCode = 0): number {
  if (message) (exitCode === 0 ? console.log : console.error)(message);
  return exitCode;
}

async function login(args: string[]): Promise<number> {
  const parsed = parseLoginArgs(args);
  if ("error" in parsed) return say(`${parsed.error}\n${USAGE}`, 1);
  let url = DEFAULT_URL;
  if (parsed.url !== null) {
    const cleaned = normalizeUrl(parsed.url);
    if (!cleaned) return say("--url must be an https URL (http works only for localhost).", 1);
    url = cleaned;
  }

  if (!parsed.token) return deviceLogin(url);

  const token = await promptHidden("CLI token (from the app's /setup page): ");
  const problem = validateToken(token);
  if (problem) return say(problem, 1);

  const me = await send(meRequest(url, token), { timeoutMs: API_TIMEOUT_MS, retry: true });
  if ("error" in me) return say(`${unreachable(me.error, API_TIMEOUT_MS)} Nothing was saved.`, 1);
  const checked = interpretMe(me.status, me.body, url);
  if (checked.exitCode !== 0) return say(checked.message, checked.exitCode);

  await saveConfig(configPath(), { token, url });
  return say(`${checked.message} Saved to ${configPath()}.`);
}

/** Login without a token to paste: approve in the browser, and the CLI collects its own token. */
async function deviceLogin(url: string, showNext = true): Promise<number> {
  const started = await send(deviceStartRequest(url, clientName()), {
    timeoutMs: API_TIMEOUT_MS,
    retry: false,
  });
  if ("error" in started) return say(unreachable(started.error, API_TIMEOUT_MS), 1);
  const start = interpretStart(started.status, started.body);
  if ("error" in start) return say(start.error, 1);

  const page = approveUrl(url, start.userCode);
  console.log(`Your code: ${start.userCode}`);
  console.log(`Opening ${page}`);
  console.log("If the browser doesn't open, visit that address and check the code matches.");
  openBrowser(page);
  console.log("Waiting for you to approve in the browser... (Ctrl+C to cancel)");

  // Ctrl+C: stop polling and leave nothing behind; the code expires on its own.
  const cancel = () => {
    console.error("\nLogin cancelled. Nothing was saved.");
    process.exit(130);
  };
  process.once("SIGINT", cancel);
  const result = await pollForToken(url, start).finally(() => process.off("SIGINT", cancel));

  if (result.kind === "expired") {
    return say(
      `The code expired after ${Math.round(start.expiresIn / 60)} minutes. Nothing was saved. Run session-coach login again.`,
      1,
    );
  }
  if (result.kind === "denied")
    return say("The login was denied in the browser. Nothing was saved.", 1);
  if (result.kind === "error") return say(`${result.message} Nothing was saved.`, 1);

  await saveConfig(configPath(), { token: result.token, url });
  const who = result.email ? `Signed in as ${result.email}.` : `Signed in to ${url}.`;
  return say(
    `${who} Saved to ${configPath()}.${showNext ? "\nNext: session-coach push --latest" : ""}`,
  );
}

async function push(args: string[]): Promise<number> {
  const parsed = parsePushArgs(args);
  if ("error" in parsed) return say(`${parsed.error}\n${USAGE}`, 1);

  if ("latest" in parsed) {
    const cwd = resolveCwd(process.env, process.cwd());
    const found = await findLatestLog(defaultProjectsDir(), cwd);
    if ("error" in found) return say(found.error, 1);
    const problem = validateFileName(found.name);
    if (problem) return say(`${found.path}: ${problem}`, 1);
    console.log(`Pushing ${found.name} (${formatSize(found.size)})`);
    return pushFile(found.path);
  }
  return pushFile(parsed.file);
}

async function pushFile(file: string): Promise<number> {
  const nameProblem = validateFileName(file);
  if (nameProblem) return say(nameProblem, 1);

  const config = await loadConfig(configPath());
  if (!config) return say("Not signed in. Run session-coach login first.", 1);

  const uploaded = await uploadLog(file, basename(file), config);
  if (uploaded.kind === "unreadable") return say(`Couldn't read ${file}.`, 1);
  if (uploaded.kind === "too_big") return say("Log over 50 MB, too big to upload.", 1);
  if (uploaded.kind === "unreachable")
    return say(unreachable(uploaded.error, uploaded.timeoutMs), 1);
  if (uploaded.kind === "not_created")
    return say(uploaded.result.message, uploaded.result.exitCode);
  if (uploaded.kind === "not_stored") return say(interpretPut(uploaded.status).message, 1);
  const { status, body, retryAfter } = uploaded.answer;
  const result = interpretProcess(status, body, uploaded.id, retryAfter);
  return say(result.message, result.exitCode);
}

/**
 * For a SessionStart hook: its stdout goes into Claude's context, so this prints nothing, always exits 0, and exits
 * itself because an upload cut off by the deadline would otherwise keep the process alive.
 */
async function sync(): Promise<never> {
  try {
    const stdin = process.stdin.isTTY ? null : await readStdin(process.stdin);
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
  if ("error" in parsed) return say(`${parsed.error}\n${USAGE}`, 1);
  let url = DEFAULT_URL;
  if (parsed.url !== null) {
    const cleaned = normalizeUrl(parsed.url);
    if (!cleaned) return say("--url must be an https URL (http works only for localhost).", 1);
    url = cleaned;
  }

  const ask = async (question: string): Promise<boolean> => {
    if (parsed.yes) {
      console.log(`${question} yes (--yes)`);
      return true;
    }
    if (!process.stdin.isTTY) {
      console.log(
        `${question} skipped: there's no terminal to answer in. Run session-coach init --yes to say yes to every step.`,
      );
      return false;
    }
    for (;;) {
      const line = await promptLine(`${question} [Y/n] `);
      // Ctrl-D or Ctrl-C is a no, never the default.
      if (line === null) return false;
      const answer = parseYesNo(line, true);
      if (answer !== null) return answer;
    }
  };

  console.log("Set up Session Coach for this project, in 4 steps. Nothing changes without a yes.");

  console.log(stepHeading(1, INIT_STEPS, "Sign in"));
  const saved = await loadConfig(configPath());
  let signedIn = false;
  if (saved && (parsed.url === null || saved.url === url)) {
    url = saved.url;
    const me = await send(meRequest(url, saved.token), { timeoutMs: API_TIMEOUT_MS, retry: true });
    if (!("error" in me)) {
      const checked = interpretMe(me.status, me.body, url);
      if (checked.exitCode === 0) {
        console.log(`${checked.message} Nothing to do.`);
        signedIn = true;
      }
    }
  }
  if (!signedIn) {
    console.log(
      "Your browser opens a page with a code. Check it matches the one here, then click Approve. There's no token to copy.",
    );
    const code = await deviceLogin(url, false);
    if (code !== 0) return code;
  }

  console.log(stepHeading(2, INIT_STEPS, "Turn on automatic uploads for this project"));
  const cwd = resolveCwd(process.env, process.cwd());
  const settingsFile = join(cwd, ".claude", "settings.json");
  console.log(
    [
      "A SessionStart hook in this project's .claude/settings.json runs `session-coach sync` whenever a Claude Code session starts.",
      "It uploads one finished session (quiet for 5 minutes, from the last 7 days), prints nothing and never holds Claude Code up.",
      "Secrets are removed on your laptop before upload, as best it can; only add it to projects you're happy to send.",
    ].join("\n"),
  );
  // Only a missing file is "no settings yet"; any other read error stops this step rather than risk a rewrite.
  let current: string | null = null;
  let unreadable: string | null = null;
  try {
    current = await readFile(settingsFile, "utf8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") unreadable = code ?? "unreadable";
  }
  const edit = unreadable
    ? ({ kind: "invalid", reason: `it couldn't be read (${unreadable})` } as const)
    : addSyncHook(current);
  if (edit.kind === "present") console.log("The hook is already in this project. Nothing to do.");
  else if (edit.kind === "invalid") {
    console.log(
      `Left ${settingsFile} as it is: ${edit.reason}. Fix it, then run session-coach init again.`,
    );
  } else if (await ask(`Add the hook to ${settingsFile}?`)) {
    await mkdir(dirname(settingsFile), { recursive: true });
    // Written beside it, then renamed over it, so an interrupted write never leaves half a settings file.
    const temporary = `${settingsFile}.${process.pid}.tmp`;
    await writeFile(temporary, edit.text);
    await rename(temporary, settingsFile);
    console.log(
      "Added. Commit .claude/settings.json if your team should share it, or keep it local.",
    );
  } else console.log("Skipped. Upload by hand with session-coach push --latest.");

  console.log(stepHeading(3, INIT_STEPS, "Send your newest session"));
  const found = await findLatestLog(defaultProjectsDir(), cwd);
  if ("error" in found) {
    console.log(
      `${found.error}\nThat's fine: finish a Claude Code session in this folder and it uploads on your next session start.`,
    );
  } else if (await ask(`Upload ${found.name} (${formatSize(found.size)}) now?`)) {
    const code = await pushFile(found.path);
    if (code !== 0)
      console.log("The upload didn't go through; the hook tries again on your next session start.");
  } else console.log("Skipped. The hook sends it later, or run session-coach push --latest.");

  console.log(stepHeading(4, INIT_STEPS, "What happens next"));
  return say(
    [
      `1. Within a few minutes, up to 5 decision cards from each session appear at ${url}/dashboard.`,
      "2. Explain each decision in your own words. A card comes back after 1 day, then 3, then 7, until you own it.",
      "3. Defend any card you've explained, whenever you want harder practice.",
      "Run session-coach init in another project to turn it on there too.",
    ].join("\n"),
  );
}

async function main(argv: string[]): Promise<number> {
  const [command, ...args] = argv;
  if (command === "init") return init(args);
  if (command === "login") return login(args);
  if (command === "push") return push(args);
  if (command === "sync") return sync();
  return say(USAGE, command ? 1 : 0);
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (err: unknown) => {
    // Error messages here come from our own code or Node's fs; none carry the token.
    console.error(err instanceof Error ? err.message : "Something went wrong.");
    process.exitCode = 1;
  },
);
