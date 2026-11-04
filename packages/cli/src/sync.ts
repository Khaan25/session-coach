// `session-coach sync`: run by a Claude Code SessionStart hook, uploads the project's recent finished sessions.
// Whatever the hook's stdout holds goes into Claude's context, so nothing here prints. Every outcome, error or not,
// is a line in sync.log, and `runSync` never throws.

import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { Readable } from "node:stream";

import type { SessionStatus } from "@session-coach/shared/session";

import { configPath, loadConfig, type Config } from "./config.ts";
import { defaultProjectsDir, findRecentLogs, resolveCwd, type LogFile } from "./latest.ts";
import { validateFileName } from "./push.ts";
import { loadState, saveState, syncPaths } from "./state.ts";
import { uploadLog } from "./upload.ts";

// Kept here too: the deadline below is sized from them, and tests import them from this file.
export { API_TIMEOUT_MS, UPLOAD_TIMEOUT_MS } from "./upload.ts";

/** Only sessions modified in the last 7 days: the web app drops cards for older ones from the review queue anyway. */
export const SYNC_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** A log modified more recently than this (5 minutes) may still be written to, so it waits for a later start. */
export const SYNC_QUIET_MS = 5 * 60 * 1000;
/** One log per run: each upload starts a model run, and the free tier's 8,000 tokens a minute can't take several. */
export const SYNC_MAX_LOGS = 1;
/**
 * The whole run gives up after this, so a slow server can't keep a hook process alive for long. It must outlast one
 * log's slowest honest path: the register and start-processing calls (`API_TIMEOUT_MS` each) around an upload of up to
 * `UPLOAD_TIMEOUT_MS`.
 */
export const SYNC_DEADLINE_MS = 180_000;

const STDIN_TIMEOUT_MS = 1_000;
const STDIN_MAX_BYTES = 64 * 1024;

const PATH_SEPARATOR = /[\\/]/;
const JSONL_EXTENSION = /\.jsonl$/;

/**
 * Reads a stream to the end, at most `maxBytes` (the last chunk is cut to fit), and gives up waiting after
 * `timeoutMs`. Once it has finished it ignores the stream and pauses it. Never rejects.
 */
export function readStdin(
  stream: Readable,
  timeoutMs = STDIN_TIMEOUT_MS,
  maxBytes = STDIN_MAX_BYTES,
): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let done = false;
    const onData = (chunk: Buffer | string) => {
      if (done) return;
      const buffer = Buffer.from(chunk);
      const kept = buffer.subarray(0, maxBytes - size);
      chunks.push(kept);
      size += kept.length;
      if (size >= maxBytes) finish();
    };
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      stream.off("data", onData);
      stream.pause();
      resolve(Buffer.concat(chunks).toString("utf8"));
    };
    const timer = setTimeout(finish, timeoutMs);
    stream.on("data", onData);
    // These stay attached after `finish`: an error on a stream nobody listens to would be thrown.
    stream.on("end", finish);
    stream.on("close", finish);
    stream.on("error", finish);
  });
}

/** What the hook's stdin JSON tells sync: the folder, and the session that is running now. */
export type HookInput = { cwd: string | null; currentIds: Set<string> };

/** Session id of a log file name or path: the base name without `.jsonl`. */
function sessionIdOf(fileName: string): string {
  return (fileName.split(PATH_SEPARATOR).pop() ?? fileName).replace(JSONL_EXTENSION, "");
}

/** Reads the hook's JSON. Anything that isn't the expected shape is ignored, so bad input never stops a sync. */
export function parseHookInput(text: string | null): HookInput {
  const input: HookInput = { cwd: null, currentIds: new Set() };
  if (!text) return input;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return input;
  }
  const { session_id, cwd, transcript_path } = (parsed ?? {}) as Record<string, unknown>;
  if (typeof session_id === "string" && session_id) input.currentIds.add(session_id);
  if (typeof transcript_path === "string" && transcript_path) {
    input.currentIds.add(sessionIdOf(transcript_path));
  }
  if (typeof cwd === "string" && cwd) input.cwd = cwd;
  return input;
}

export type SyncDeps = {
  /** What the hook wrote to stdin, or null when stdin was a terminal. */
  stdin: string | null;
  env: Record<string, string | undefined>;
  /** The process's own cwd, used when the hook doesn't give one. */
  cwd: string;
  /** Where `.session-coach/` and `.claude/projects` live; the real home when unset. */
  home?: string;
  /** Overrides `<home>/.claude/projects`. */
  projectsDir?: string;
  now?: () => number;
  fetchImpl?: typeof fetch;
  backoffMs?: number;
  deadlineMs?: number;
};

/** What happened to one log. `skip` and `stop` are not written to the state, so a later start tries again. */
type LogResult =
  | { kind: "uploaded" }
  | { kind: "already" }
  | { kind: "failed"; reason: string }
  | { kind: "skip"; reason: string }
  | { kind: "stop"; reason: string };

/** Appends a line to sync.log. A failure to write is dropped: there is nowhere left to report it. */
async function writeLog(path: string, time: number, message: string): Promise<void> {
  try {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    await appendFile(path, `${new Date(time).toISOString()}  ${message}\n`, { mode: 0o600 });
  } catch {
    // nowhere to report it
  }
}

/** Pushes one log the way `push` does, but returns what happened instead of printing it. */
async function syncLog(file: LogFile, config: Config, deps: SyncDeps): Promise<LogResult> {
  const stop = (reason: string): LogResult => ({ kind: "stop", reason });
  const uploaded = await uploadLog(file.path, file.name, config, {
    backoffMs: deps.backoffMs,
    fetchImpl: deps.fetchImpl,
  });
  if (uploaded.kind === "unreadable") return { kind: "skip", reason: "couldn't read the file" };
  if (uploaded.kind === "too_big") return { kind: "failed", reason: "over 50 MB" };
  if (uploaded.kind === "unreachable") return stop(uploaded.error);

  if (uploaded.kind === "not_created") {
    const { status } = uploaded.answer;
    if (status === 401) return stop("the token was refused, run session-coach login");
    if (status === 429 || status >= 500) return stop(`server answered HTTP ${status}`);
    // 409 with no upload url: ready or processing already.
    if (uploaded.result.exitCode === 0) return { kind: "already" };
    if (status === 400 || status === 413)
      return { kind: "failed", reason: `rejected (HTTP ${status})` };
    return stop(`server answered HTTP ${status}`);
  }
  if (uploaded.kind === "not_stored") return stop(`upload answered HTTP ${uploaded.status}`);

  // ③ answered; it isn't retried, a later start asks again (a pending session answers 409 with a fresh URL)
  const { status, body } = uploaded.answer;
  if (status === 202) return { kind: "uploaded" };
  if (status === 409) {
    const state = (body as { status?: SessionStatus } | null)?.status;
    return state === "failed"
      ? { kind: "failed", reason: "processing failed" }
      : { kind: "already" };
  }
  return stop(`processing answered HTTP ${status}`);
}

async function syncProject(
  deps: SyncDeps,
  paths: ReturnType<typeof syncPaths>,
  isCancelled: () => boolean,
  note: (message: string) => Promise<void>,
): Promise<void> {
  const config = await loadConfig(configPath(deps.home));
  if (!config) return note("not signed in, nothing uploaded");

  const hook = parseHookInput(deps.stdin);
  const cwd = hook.cwd ?? resolveCwd(deps.env, deps.cwd);
  const now = (deps.now ?? Date.now)();
  const state = await loadState(paths.state);

  const recent = await findRecentLogs(deps.projectsDir ?? defaultProjectsDir(deps.home), cwd, {
    since: now - SYNC_MAX_AGE_MS,
    until: now - SYNC_QUIET_MS,
  });
  const queue = recent
    .filter((file) => {
      const id = sessionIdOf(file.name);
      return (
        !hook.currentIds.has(id) && validateFileName(file.name) === null && !(id in state.done)
      );
    })
    .slice(0, SYNC_MAX_LOGS);
  if (queue.length === 0) return;

  const counts = { uploaded: 0, already: 0, failed: 0 };
  let stopped: string | null = null;
  for (const file of queue) {
    if (isCancelled()) break;
    const result = await syncLog(file, config, deps);
    if (isCancelled()) break;
    if (result.kind === "stop") {
      stopped = result.reason;
      break;
    }
    if (result.kind === "skip") {
      await note(`${sessionIdOf(file.name)}: ${result.reason}`);
      continue;
    }
    if (result.kind === "failed") await note(`${sessionIdOf(file.name)}: ${result.reason}`);
    counts[result.kind] += 1;
    state.done[sessionIdOf(file.name)] = {
      outcome: result.kind === "failed" ? "failed" : "pushed",
      at: new Date(now).toISOString(),
    };
    try {
      await saveState(paths.state, state);
    } catch {
      await note("couldn't save sync-state.json, these logs will be asked about again");
    }
  }
  const tail = stopped ? `, stopped: ${stopped}` : "";
  await note(
    `${counts.uploaded} uploaded, ${counts.already} already on the server, ${counts.failed} failed${tail}`,
  );
}

/**
 * Uploads the project's recent finished sessions: the newest `SYNC_MAX_LOGS` top-level logs modified between
 * `SYNC_MAX_AGE_MS` and `SYNC_QUIET_MS` ago, except the running session and those the state file already lists. Writes
 * nothing to stdout or stderr and never throws; not signed in, offline or a server error end the run quietly.
 */
export async function runSync(deps: SyncDeps): Promise<void> {
  const note = (message: string) =>
    writeLog(syncPaths(deps.home).log, (deps.now ?? Date.now)(), message);
  let cancelled = false;
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<void>((resolve) => {
    timer = setTimeout(() => {
      cancelled = true;
      resolve();
    }, deps.deadlineMs ?? SYNC_DEADLINE_MS);
  });
  try {
    await Promise.race([syncProject(deps, syncPaths(deps.home), () => cancelled, note), deadline]);
    if (cancelled) await note("stopped: ran out of time");
  } catch (err) {
    await note(`error: ${err instanceof Error ? err.message : "unknown"}`);
  } finally {
    clearTimeout(timer);
  }
}
