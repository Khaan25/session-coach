// The upload `push` and `sync` share: read the log, redact and gzip it, then register, PUT and start processing. It
// returns where it stopped instead of a message, so each command reports the outcome its own way.

import { readFile } from "node:fs/promises";

import { MAX_UPLOAD_BYTES } from "@session-coach/shared/limits";

import type { Config } from "./config.ts";
import { send, type SendOptions } from "./http.ts";
import {
  createRequest,
  interpretCreate,
  interpretPut,
  prepareLog,
  processRequest,
  putRequest,
  sessionMetadata,
  type CreateResult,
} from "./push.ts";

/** Timeouts: the log upload can be up to 50 MB, so it gets longer than the small JSON calls. */
export const API_TIMEOUT_MS = 15_000;
export const UPLOAD_TIMEOUT_MS = 120_000;

/** A server's answer to step ① or ③. */
export type Answer = { status: number; body: unknown; retryAfter?: number };

/** Where `uploadLog` stopped. Only `processed` got as far as step ③. */
export type UploadResult =
  | { kind: "unreadable" }
  | { kind: "too_big" }
  /** A request got no answer; `timeoutMs` is the limit that step had. */
  | { kind: "unreachable"; error: "timeout" | "network"; timeoutMs: number }
  /** Step ① answered without an upload URL; `result` is how `interpretCreate` reads it. */
  | { kind: "not_created"; answer: Answer; result: Extract<CreateResult, { action: "stop" }> }
  /** Step ② answered with a non-2xx status. */
  | { kind: "not_stored"; status: number }
  /** Step ③ answered; `id` is the session id from step ①. */
  | { kind: "processed"; answer: Answer; id: string };

export type UploadOptions = Pick<SendOptions, "backoffMs" | "fetchImpl">;

/**
 * Uploads one log in three steps: ① register the session, ② PUT the gzip to the signed URL, ③ start processing.
 * Never throws and never prints.
 *
 * @param path - The log to read.
 * @param name - Its file name, which becomes the session's external id.
 * @param config - The saved token and site URL.
 * @param options - Retry backoff and fetch, for tests.
 */
export async function uploadLog(
  path: string,
  name: string,
  config: Config,
  options: UploadOptions = {},
): Promise<UploadResult> {
  let bytes: Buffer;
  try {
    bytes = await readFile(path);
  } catch {
    return { kind: "unreadable" };
  }
  const { gzipped, text } = prepareLog(bytes);
  if (gzipped.length > MAX_UPLOAD_BYTES) return { kind: "too_big" };

  // ① register the session
  // Safe to repeat: a second POST for the same session gets a 409 with a fresh upload URL.
  const meta = sessionMetadata(text, name, gzipped.length);
  const created = await send(createRequest(config.url, config.token, meta), {
    ...options,
    timeoutMs: API_TIMEOUT_MS,
    retry: true,
  });
  if ("error" in created) {
    return { kind: "unreachable", error: created.error, timeoutMs: API_TIMEOUT_MS };
  }
  const next = interpretCreate(created.status, created.body, created.retryAfter);
  if (next.action === "stop") return { kind: "not_created", answer: created, result: next };

  // ② PUT the log to the signed URL
  // Safe to repeat: the PUT upserts the same object.
  const put = await send(putRequest(next.uploadUrl, gzipped), {
    ...options,
    timeoutMs: UPLOAD_TIMEOUT_MS,
    retry: true,
  });
  if ("error" in put)
    return { kind: "unreachable", error: put.error, timeoutMs: UPLOAD_TIMEOUT_MS };
  if (interpretPut(put.status).exitCode !== 0) return { kind: "not_stored", status: put.status };

  // ③ start processing
  // Not retried: it starts the pipeline, and push or a later sync can simply ask again.
  const processed = await send(processRequest(config.url, config.token, next.id), {
    ...options,
    timeoutMs: API_TIMEOUT_MS,
    retry: false,
  });
  if ("error" in processed) {
    return { kind: "unreachable", error: processed.error, timeoutMs: API_TIMEOUT_MS };
  }
  return { kind: "processed", answer: processed, id: next.id };
}
