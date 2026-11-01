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
  type HttpRequest,
} from "./push.ts";

const USAGE = `Usage:
  session-coach login [--url <site url>]
  session-coach push <file.jsonl>`;

/** Prints a message and returns the exit code. */
function say(message: string, exitCode = 0): number {
  if (message) (exitCode === 0 ? console.log : console.error)(message);
  return exitCode;
}

/** Sends a request; a network failure becomes a short message that carries neither the URL nor the token. */
async function send(req: HttpRequest): Promise<{ status: number; body: unknown } | null> {
  try {
    const res = await fetch(req.url, req.init);
    const body: unknown = await res.json().catch(() => null);
    return { status: res.status, body };
  } catch {
    return null;
  }
}

const NETWORK_ERROR =
  "Couldn't reach the server. Check your connection and the --url, then try again.";

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

  await saveConfig(configPath(), { token, url });
  return say(`Saved to ${configPath()}. Signed in to ${url}.`);
}

async function push(args: string[]): Promise<number> {
  const parsed = parsePushArgs(args);
  if ("error" in parsed) return say(`${parsed.error}\n${USAGE}`, 1);
  const { file } = parsed;

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
  const created = await send(createRequest(config.url, config.token, meta));
  if (!created) return say(NETWORK_ERROR, 1);
  const next = interpretCreate(created.status, created.body);
  if (next.action === "stop") return say(next.message, next.exitCode);

  // ② PUT the log to the signed URL
  const put = await send(putRequest(next.uploadUrl, gzipped));
  if (!put) return say(NETWORK_ERROR, 1);
  const stored = interpretPut(put.status);
  if (stored.exitCode !== 0) return say(stored.message, stored.exitCode);

  // ③ start processing
  const processed = await send(processRequest(config.url, config.token, next.id));
  if (!processed) return say(NETWORK_ERROR, 1);
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
