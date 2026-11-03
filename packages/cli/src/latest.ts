// Finds the newest Claude Code log for a project folder. Pure apart from reading the projects directory.

import { open, readdir, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type LatestLog = { path: string; name: string; size: number } | { error: string };

/** Where Claude Code keeps its per-project logs. */
export function defaultProjectsDir(): string {
  return join(homedir(), ".claude", "projects");
}

/**
 * The folder to look up: `INIT_CWD` when set (pnpm sets it to where the command was typed, while the CLI itself
 * runs from packages/cli), else the process's own cwd.
 */
export function resolveCwd(env: Record<string, string | undefined>, cwd: string): string {
  return env.INIT_CWD || cwd;
}

const NOT_DIR_CHAR = /[^a-zA-Z0-9-]/g;

/**
 * Claude Code's folder name for a project: every character other than a letter, digit or `-` becomes `-`.
 * Verified for `/` and `_`; the rule for dots, spaces and other characters is a guess.
 */
export function projectDirName(cwd: string): string {
  return cwd.replace(NOT_DIR_CHAR, "-");
}

/** Formats a byte count as B, KB or MB. */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** How much of a log is read to find its `cwd`: the first 64 KB, at most 50 lines. */
const HEAD_BYTES = 64 * 1024;
const HEAD_LINES = 50;

const TRAILING_SLASHES = /\/+$/;

/** Drops trailing slashes, so `/work/a/` and `/work/a` compare equal. The root stays `/`. */
function trimSlash(path: string): string {
  return path.replace(TRAILING_SLASHES, "") || "/";
}

/** The first `cwd` string in the head of a log, or null. Lines that don't parse (a cut last line) are skipped. */
async function recordedCwd(path: string): Promise<string | null> {
  let head: string;
  try {
    const file = await open(path, "r");
    try {
      const buffer = Buffer.alloc(HEAD_BYTES);
      const { bytesRead } = await file.read(buffer, 0, HEAD_BYTES, 0);
      head = buffer.toString("utf8", 0, bytesRead);
    } finally {
      await file.close();
    }
  } catch {
    return null;
  }
  for (const line of head.split("\n").slice(0, HEAD_LINES)) {
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event !== null && typeof event === "object" && "cwd" in event) {
      if (typeof event.cwd === "string") return event.cwd;
    }
  }
  return null;
}

type Candidate = { path: string; name: string; size: number; mtimeMs: number };

/** The top-level `.jsonl` files of a project's folder, newest first, or null when the folder can't be read. */
async function listCandidates(dir: string): Promise<Candidate[] | null> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  const candidates: Candidate[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".jsonl")) continue;
    const path = join(dir, entry.name);
    const info = await stat(path).catch(() => null);
    if (!info) continue;
    candidates.push({ path, name: entry.name, size: info.size, mtimeMs: info.mtimeMs });
  }
  return candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

/** The spellings of `cwd` a log may record: as given, and with symlinks resolved. */
async function acceptedCwds(cwd: string): Promise<Set<string>> {
  const accepted = new Set([trimSlash(cwd)]);
  const real = await realpath(cwd).catch(() => null);
  if (real) accepted.add(trimSlash(real));
  return accepted;
}

/**
 * Finds the newest `.jsonl` (by modified time) directly inside the project's folder whose recorded `cwd` is the
 * current folder. Fails closed: two folders can encode to the same name (`/work/a-b` and `/work/a/b`), so a log
 * with no `cwd`, or another one, is never chosen. Subfolders are not read, and no other project is tried.
 *
 * @param projectsDir - The folder that holds one folder per project.
 * @param cwd - The project's working directory.
 */
export async function findLatestLog(projectsDir: string, cwd: string): Promise<LatestLog> {
  const dir = join(projectsDir, projectDirName(cwd));
  const candidates = await listCandidates(dir);
  if (candidates === null) return { error: `No Claude Code logs found in ${dir}.` };
  if (candidates.length === 0) return { error: `No .jsonl logs found in ${dir}.` };

  const accepted = await acceptedCwds(cwd);
  for (const { path, name, size } of candidates) {
    const recorded = await recordedCwd(path);
    if (recorded !== null && accepted.has(trimSlash(recorded))) return { path, name, size };
  }
  return { error: `No log in ${dir} was recorded in this folder (${cwd}), so nothing was chosen.` };
}

export type LogFile = { path: string; name: string; size: number; mtimeMs: number };

/**
 * Every `.jsonl` directly inside the project's folder that was modified inside a time window and whose recorded
 * `cwd` is the current folder, newest first. The same fail-closed matching as `findLatestLog`. An unreadable folder
 * is an empty list.
 *
 * @param projectsDir - The folder that holds one folder per project.
 * @param cwd - The project's working directory.
 * @param window - Modified at or after `since` and at or before `until`, in epoch milliseconds.
 */
export async function findRecentLogs(
  projectsDir: string,
  cwd: string,
  window: { since: number; until: number },
): Promise<LogFile[]> {
  const candidates = await listCandidates(join(projectsDir, projectDirName(cwd)));
  if (candidates === null) return [];
  const accepted = await acceptedCwds(cwd);
  const found: LogFile[] = [];
  for (const candidate of candidates) {
    if (candidate.mtimeMs < window.since || candidate.mtimeMs > window.until) continue;
    const recorded = await recordedCwd(candidate.path);
    if (recorded !== null && accepted.has(trimSlash(recorded))) found.push(candidate);
  }
  return found;
}
