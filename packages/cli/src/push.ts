// Request building and response handling for `push`. Pure, so node --test runs it with no network.

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
  const base = fileName.split(/[\\/]/).pop() ?? fileName;
  const meta: SessionMetadata = {
    external_id: base.replace(/\.jsonl$/, ""),
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

/** Messages shared by steps ① and ③. Never includes the token or the upload URL. */
function commonFailure(status: number): Outcome | null {
  if (status === 401) return { message: "Run session-coach login again.", exitCode: 1 };
  if (status === 413) return { message: "Log over 50 MB, too big to upload.", exitCode: 1 };
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
 * Step ① response: 201 or 409-with-upload_url means upload; 409 with only an id means it was done before.
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
        message: `Already processed.\nSession id: ${id}`,
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
