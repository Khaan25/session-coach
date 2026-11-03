// The sync state: which sessions `sync` has already dealt with, so a session start doesn't redact and gzip the
// same logs again. Only a convenience: the server dedupes on (user_id, external_id), so losing this file costs a
// few repeated requests, never a duplicate session.

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import { configPath } from "./config.ts";

/** `pushed`: on the server (uploaded now, or already ready or processing). `failed`: the server gave up on it. */
export type SyncOutcome = "pushed" | "failed";

export type SyncState = {
  version: 1;
  /** Session id (the log's file name without `.jsonl`) to what happened to it, and when. */
  done: Record<string, { outcome: SyncOutcome; at: string }>;
};

/** The files sync keeps, next to `config.json`. */
export function syncPaths(home: string = homedir()): { state: string; log: string } {
  const dir = dirname(configPath(home));
  return { state: join(dir, "sync-state.json"), log: join(dir, "sync.log") };
}

function isOutcome(value: unknown): value is SyncOutcome {
  return value === "pushed" || value === "failed";
}

/**
 * Reads the state. A missing, unreadable, corrupt or other-version file is an empty state, and an entry that doesn't
 * have the expected shape is dropped, so this never throws.
 */
export async function loadState(path: string): Promise<SyncState> {
  // No prototype, so an id like `__proto__` is an ordinary key.
  const empty: SyncState = { version: 1, done: Object.create(null) };
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, "utf8"));
  } catch {
    return empty;
  }
  const { version, done } = (parsed ?? {}) as { version?: unknown; done?: unknown };
  if (version !== 1 || done === null || typeof done !== "object" || Array.isArray(done)) {
    return empty;
  }
  for (const [id, entry] of Object.entries(done)) {
    const { outcome, at } = (entry ?? {}) as { outcome?: unknown; at?: unknown };
    if (isOutcome(outcome) && typeof at === "string") empty.done[id] = { outcome, at };
  }
  return empty;
}

/**
 * Writes the state through a temporary file and a rename, so a run cut off mid-write leaves the old file whole.
 * Two syncs at once can overwrite each other's entries; the loser is asked about again and the server answers 409.
 */
export async function saveState(path: string, state: SyncState): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temp = `${path}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  await rename(temp, path);
}
