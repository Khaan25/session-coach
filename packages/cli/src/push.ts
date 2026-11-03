// Request building and response handling for `push`. Pure, so node --test runs it with no network.

import { gzipSync } from "node:zlib";

import { redact } from "@session-coach/shared/redact";

/** Storage's per-file limit, mirrored from the server (`MAX_UPLOAD_BYTES` in apps/web/src/lib/sessions/upload.ts). */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export type SessionMetadata = {
  external_id: string;
  size_bytes: number;
  title: null;
  started_at?: string;
};

export type HttpRequest = { url: string; init: RequestInit };

/** What `push` does next. `exitCode` 0 is success or nothing to do. */
export type Outcome = { message: string; exitCode: number };

export type CreateResult =
  | { action: "upload"; id: string; uploadUrl: string }
  | { action: "stop"; message: string; exitCode: number };

/**
 * The first parseable `timestamp` in a Claude Code log, as an ISO string with an offset.
 *
 * @param jsonl - The log's text, one JSON object per line.
 * @returns The ISO time, or undefined when no line has a usable timestamp.
 */
export function firstTimestamp(jsonl: string): string | undefined {
  for (const line of jsonl.split("\n")) {
    if (!line.trim()) continue;
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    const raw = (event as { timestamp?: unknown } | null)?.timestamp;
    if (typeof raw !== "string" && typeof raw !== "number") continue;
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return undefined;
}

/** Path separators, POSIX or Windows. */
const PATH_SEPARATOR = /[\\/]/;
const JSONL_EXTENSION = /\.jsonl$/;

/**
 * The metadata for step ①.
 *
 * @param jsonl - The log's text.
 * @param fileName - The log's file name or path; `.jsonl` is dropped to make the external id.
 * @param gzippedSize - Byte length of the gzipped log, which is what gets uploaded.
 */
export function sessionMetadata(
  jsonl: string,
  fileName: string,
  gzippedSize: number,
): SessionMetadata {
  const base = fileName.split(PATH_SEPARATOR).pop() ?? fileName;
  const meta: SessionMetadata = {
    external_id: base.replace(JSONL_EXTENSION, ""),
    size_bytes: gzippedSize,
    title: null,
  };
  const startedAt = firstTimestamp(jsonl);
  if (startedAt) meta.started_at = startedAt;
  return meta;
}

/** Step ①: POST /api/sessions. */
export function createRequest(baseUrl: string, token: string, meta: SessionMetadata): HttpRequest {
  return {
    url: `${baseUrl}/api/sessions`,
    init: {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(meta),
    },
  };
}

/**
 * Step ②: PUT the gzip to the signed URL, the way storage-js `uploadToSignedUrl` sends a raw body. The token is
 * already in the URL's query, so there is no Authorization header.
 */
export function putRequest(uploadUrl: string, body: Uint8Array): HttpRequest {
  return {
    url: uploadUrl,
    init: {
      method: "PUT",
      headers: {
        "content-type": "text/plain;charset=UTF-8",
        "cache-control": "max-age=3600",
        "x-upsert": "true",
      },
      body: body as BodyInit,
    },
  };
}

/** Step ③: POST /api/sessions/<id>/process. */
export function processRequest(baseUrl: string, token: string, id: string): HttpRequest {
  return {
    url: `${baseUrl}/api/sessions/${encodeURIComponent(id)}/process`,
    init: { method: "POST", headers: { authorization: `Bearer ${token}` } },
  };
}

/** The server's pattern for `external_id`. */
const EXTERNAL_ID = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Checks the file name locally against the server's `external_id` pattern, so a bad name fails before any request.
 *
 * @param fileName - The log's file name or path; `.jsonl` is dropped before the check.
 * @returns A message telling the user how to fix the name, or null when it is fine.
 */
export function validateFileName(fileName: string): string | null {
  const base = fileName.split(PATH_SEPARATOR).pop() ?? fileName;
  if (EXTERNAL_ID.test(base.replace(JSONL_EXTENSION, ""))) return null;
  return "Rename the file to letters, numbers, - and _ only (max 128 characters).";
}

/** Event top-level fields that are the log's structure: they link events and are never secrets. */
const EVENT_KEYS = new Set(["uuid", "parentUuid", "sessionId", "requestId", "timestamp", "type"]);
/** Fields of `event.message` that are structure. */
const MESSAGE_KEYS = new Set(["id", "role", "type"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Redacts every string inside a parsed JSON value, at any depth, with no exemption. */
function redactAll(value: unknown): unknown {
  if (typeof value === "string") return redact(value);
  if (Array.isArray(value)) return value.map(redactAll);
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactAll(v)]));
  }
  return value;
}

/** Copies an object, leaving the string values of `keep` as they are and redacting everything else. */
function redactExcept(
  obj: Record<string, unknown>,
  keep: (key: string) => boolean,
  nested: (key: string, value: unknown) => unknown = (_, v) => redactAll(v),
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, keep(k) && typeof v === "string" ? v : nested(k, v)]),
  );
}

/** A content block: `type` is structural, plus `id` on a tool_use and `tool_use_id` on a tool_result. */
function redactBlock(block: unknown): unknown {
  if (!isRecord(block)) return redactAll(block);
  const { type } = block;
  return redactExcept(
    block,
    (k) =>
      k === "type" ||
      (k === "id" && type === "tool_use") ||
      (k === "tool_use_id" && type === "tool_result"),
  );
}

function redactMessage(message: unknown): unknown {
  if (!isRecord(message)) return redactAll(message);
  return redactExcept(
    message,
    (k) => MESSAGE_KEYS.has(k),
    (k, v) => (k === "content" && Array.isArray(v) ? v.map(redactBlock) : redactAll(v)),
  );
}

/**
 * Redacts a parsed log event. Only the known structural fields keep their string values: the event's own
 * (EVENT_KEYS), `message.id`/`role`/`type`, and the `type`, tool_use `id` and tool_result `tool_use_id` of the
 * blocks in `message.content`. Every other string, including a tool_use's whole `input`, a tool_result's `content`
 * and `toolUseResult`, is redacted at every depth. Keys, numbers, booleans and null are left as they are.
 */
function redactEvent(event: unknown): unknown {
  if (!isRecord(event)) return redactAll(event);
  return redactExcept(
    event,
    (k) => EVENT_KEYS.has(k),
    (k, v) => (k === "message" ? redactMessage(v) : redactAll(v)),
  );
}

/**
 * Redacts a log line by line, so every line that was JSON is still JSON. A line is parsed, its string values are
 * redacted and it is serialized again; the rules never run over raw JSON text. A line that doesn't parse is kept
 * in place and redacted as plain text. Blank lines are kept.
 *
 * @param text - The log's text, one JSON object per line.
 */
export function redactLog(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      if (!line.trim()) return line;
      try {
        return JSON.stringify(redactEvent(JSON.parse(line)));
      } catch {
        return redact(line);
      }
    })
    .join("\n");
}

/**
 * Redacts the log, then gzips it. The bytes are decoded as UTF-8 first, so an invalid byte arrives as U+FFFD.
 *
 * @returns The gzip that gets uploaded, and the redacted text for the metadata.
 */
export function prepareLog(bytes: Uint8Array): { gzipped: Buffer; text: string } {
  const text = redactLog(Buffer.from(bytes).toString("utf8"));
  return { gzipped: gzipSync(text), text };
}

/** Messages shared by steps ① and ③. Never includes the token or the upload URL. */
function commonFailure(status: number): Outcome | null {
  if (status === 401) return { message: "Run session-coach login again.", exitCode: 1 };
  if (status === 413) return { message: "Log over 50 MB, too big to upload.", exitCode: 1 };
  if (status === 429) {
    return {
      message:
        "Too many requests to the server in the last hour. Wait a while, then run push again.",
      exitCode: 1,
    };
  }
  return null;
}

function idOf(body: unknown): string | null {
  const id = (body as { id?: unknown } | null)?.id;
  return typeof id === "string" ? id : null;
}

/** Reads the server's message for a 400, falling back to a plain one. */
function badRequest(body: unknown): string {
  const field = (body as { field?: unknown } | null)?.field;
  return typeof field === "string"
    ? `The server rejected the ${field}.`
    : "The server rejected the request.";
}

/**
 * Step ① response: 201 or 409-with-upload_url means upload; 409 with only an id means it was uploaded before.
 *
 * @param status - HTTP status.
 * @param body - Parsed JSON body, or null if it wasn't JSON.
 */
export function interpretCreate(status: number, body: unknown): CreateResult {
  const common = commonFailure(status);
  if (common) return { action: "stop", ...common };

  const id = idOf(body);
  const uploadUrl = (body as { upload_url?: unknown } | null)?.upload_url;
  if ((status === 201 || status === 409) && id) {
    if (typeof uploadUrl === "string" && uploadUrl) return { action: "upload", id, uploadUrl };
    if (status === 409) {
      return {
        action: "stop",
        message: `This session was already uploaded and is ready or processing. Open the app to see it.\nSession id: ${id}`,
        exitCode: 0,
      };
    }
  }
  if (status === 400) return { action: "stop", message: badRequest(body), exitCode: 1 };
  return {
    action: "stop",
    message: `The server couldn't register the session (HTTP ${status}). Try again.`,
    exitCode: 1,
  };
}

/** Step ② response: any 2xx means the log landed. */
export function interpretPut(status: number): Outcome {
  if (status >= 200 && status < 300) return { message: "", exitCode: 0 };
  return { message: `Upload failed (HTTP ${status}). Run push again.`, exitCode: 1 };
}

/**
 * Step ③ response.
 *
 * @param status - HTTP status.
 * @param body - Parsed JSON body, or null if it wasn't JSON.
 * @param id - The session id from step ①, printed so the session can be found in the app and logs.
 */
export function interpretProcess(status: number, body: unknown, id: string): Outcome {
  if (status === 202) {
    return { message: `Uploaded. Cards will appear in the app.\nSession id: ${id}`, exitCode: 0 };
  }
  if (status === 409) {
    const state = (body as { status?: unknown } | null)?.status;
    const label = typeof state === "string" ? state : "unknown";
    if (state === "failed") {
      return {
        message: `Processing failed. Run push again to retry.\nSession id: ${id}`,
        exitCode: 1,
      };
    }
    return { message: `Session is already ${label}.\nSession id: ${id}`, exitCode: 0 };
  }
  if (status === 422) {
    return { message: "Upload didn't land, run push again.", exitCode: 1 };
  }
  const common = commonFailure(status);
  if (common) return common;
  if (status === 404)
    return { message: "The server doesn't know this session. Run push again.", exitCode: 1 };
  return { message: `Processing couldn't start (HTTP ${status}). Try again.`, exitCode: 1 };
}
