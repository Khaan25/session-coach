#!/usr/bin/env node
import { basename } from "node:path";

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
import { defaultProjectsDir, findLatestLog, formatSize, resolveCwd } from "./latest.ts";
import { promptHidden } from "./prompt.ts";
import { interpretProcess, interpretPut, validateFileName } from "./push.ts";
import { readStdin, runSync } from "./sync.ts";
import { API_TIMEOUT_MS, uploadLog } from "./upload.ts";

const USAGE = `Usage:
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
async function deviceLogin(url: string): Promise<number> {
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
  return say(`${who} Saved to ${configPath()}.\nNext: session-coach push --latest`);
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

async function main(argv: string[]): Promise<number> {
  const [command, ...args] = argv;
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
