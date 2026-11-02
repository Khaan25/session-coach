// Finds the newest Claude Code log for a project folder. Pure apart from reading the projects directory.

import { readdir, stat } from "node:fs/promises";
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

/**
 * Claude Code's folder name for a project: every character other than a letter, digit or `-` becomes `-`.
 * Verified for `/` and `_`; the rule for dots, spaces and other characters is a guess.
 */
export function projectDirName(cwd: string): string {
  return cwd.replace(/[^a-zA-Z0-9-]/g, "-");
}

/** Formats a byte count as B, KB or MB. */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Finds the newest `.jsonl` (by modified time) directly inside the project's folder. Subfolders are not read, and
 * no other project is tried.
 *
 * @param projectsDir - The folder that holds one folder per project.
 * @param cwd - The project's working directory.
 */
export async function findLatestLog(projectsDir: string, cwd: string): Promise<LatestLog> {
  const dir = join(projectsDir, projectDirName(cwd));
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return { error: `No Claude Code logs found in ${dir}.` };
  }

  let newest: { path: string; name: string; size: number; mtimeMs: number } | null = null;
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".jsonl")) continue;
    const path = join(dir, entry.name);
    const info = await stat(path).catch(() => null);
    if (!info) continue;
    if (!newest || info.mtimeMs > newest.mtimeMs) {
      newest = { path, name: entry.name, size: info.size, mtimeMs: info.mtimeMs };
    }
  }
  if (!newest) return { error: `No .jsonl logs found in ${dir}.` };
  return { path: newest.path, name: newest.name, size: newest.size };
}
