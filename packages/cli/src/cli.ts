#!/usr/bin/env node
import { readFile } from "node:fs/promises";
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
import { interpretMe, meRequest, send, unreachable } from "./http.ts";
import { defaultProjectsDir, findLatestLog, formatSize, resolveCwd } from "./latest.ts";
import { promptHidden } from "./prompt.ts";
import {
  createRequest,
  interpretCreate,
  interpretProcess,
  interpretPut,
  MAX_UPLOAD_BYTES,
  prepareLog,
  processRequest,
  putRequest,
  sessionMetadata,
  validateFileName,
} from "./push.ts";

const USAGE = `Usage:
  session-coach login [--url <site url>]
  session-coach push <file.jsonl>
  session-coach push --latest`;

/** Prints a message and returns the exit code. */
function say(message: string, exitCode = 0): number {
  if (message) (exitCode === 0 ? console.log : console.error)(message);
  return exitCode;
}

/** Timeouts: the log upload can be up to 50 MB, so it gets longer than the small JSON calls. */
const API_TIMEOUT_MS = 15_000;
const UPLOAD_TIMEOUT_MS = 120_000;

async function login(args: string[]): Promise<number> {
  const parsed = parseLoginArgs(args);
  if ("error" in parsed) return say(`${parsed.error}\n${USAGE}`, 1);
  let url = DEFAULT_URL;
  if (parsed.url !== null) {
    const cleaned = normalizeUrl(parsed.url);
    if (!cleaned) return say("--url must be an https URL (http works only for localhost).", 1);
    url = cleaned;
  }

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

  let bytes: Buffer;
  try {
    bytes = await readFile(file);
  } catch {
    return say(`Couldn't read ${file}.`, 1);
  }

  const { gzipped, text } = prepareLog(bytes);
  if (gzipped.length > MAX_UPLOAD_BYTES) return say("Log over 50 MB, too big to upload.", 1);

  // ① register the session
  const meta = sessionMetadata(text, basename(file), gzipped.length);
  // Safe to repeat: a second POST for the same session gets a 409 with a fresh upload URL.
  const api = { timeoutMs: API_TIMEOUT_MS, retry: true };
  const created = await send(createRequest(config.url, config.token, meta), api);
  if ("error" in created) return say(unreachable(created.error, API_TIMEOUT_MS), 1);
  const next = interpretCreate(created.status, created.body);
  if (next.action === "stop") return say(next.message, next.exitCode);

  // ② PUT the log to the signed URL
  // Safe to repeat: the PUT upserts the same object.
  const put = await send(putRequest(next.uploadUrl, gzipped), {
    timeoutMs: UPLOAD_TIMEOUT_MS,
    retry: true,
  });
  if ("error" in put) return say(unreachable(put.error, UPLOAD_TIMEOUT_MS), 1);
  const stored = interpretPut(put.status);
  if (stored.exitCode !== 0) return say(stored.message, stored.exitCode);

  // ③ start processing
  // Not retried: it starts the pipeline, and push can simply be run again.
  const processed = await send(processRequest(config.url, config.token, next.id), {
    timeoutMs: API_TIMEOUT_MS,
    retry: false,
  });
  if ("error" in processed) return say(unreachable(processed.error, API_TIMEOUT_MS), 1);
  const result = interpretProcess(processed.status, processed.body, next.id);
  return say(result.message, result.exitCode);
}

async function main(argv: string[]): Promise<number> {
  const [command, ...args] = argv;
  if (command === "login") return login(args);
  if (command === "push") return push(args);
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
