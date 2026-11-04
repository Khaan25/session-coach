import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

import { API_TIMEOUT_MS, UPLOAD_TIMEOUT_MS, uploadLog } from "./upload.ts";

const CONFIG = { token: "sc_secrettoken123", url: "https://app.test" };
const ID = "id-s1";
const UPLOAD_URL = "https://storage.test/up/s1?token=abc";

type Reply = { status: number; body?: unknown; headers?: Record<string, string> } | Error;

/** A fetch answering steps ①, ② and ③ from `replies` by step; records each call's method and url. */
function fakeFetch(replies: { create?: Reply; put?: Reply; process?: Reply }) {
  const calls: string[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push(`${init.method} ${url}`);
    const step = init.method === "PUT" ? "put" : url.endsWith("/process") ? "process" : "create";
    const defaults: Record<string, Reply> = {
      create: { status: 201, body: { id: ID, upload_url: UPLOAD_URL } },
      put: { status: 200 },
      process: { status: 202, body: {} },
    };
    const reply = replies[step] ?? defaults[step]!;
    if (reply instanceof Error) throw reply;
    return new Response(JSON.stringify(reply.body ?? null), {
      status: reply.status,
      headers: reply.headers,
    });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const LOG = JSON.stringify({ type: "user", timestamp: "2026-11-04T10:00:00.000Z" }) + "\n";

describe("uploadLog", () => {
  let dir: string;
  let file: string;
  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "upload-test-"));
    file = join(dir, "s1.jsonl");
    await writeFile(file, LOG);
  });
  after(() => rm(dir, { recursive: true, force: true }));

  const upload = (f: ReturnType<typeof fakeFetch>, path = file) =>
    uploadLog(path, "s1.jsonl", CONFIG, { fetchImpl: f.impl, backoffMs: 0 });

  it("runs the three steps and returns step ③'s answer and the id", async () => {
    const f = fakeFetch({});
    assert.deepEqual(await upload(f), {
      kind: "processed",
      answer: { status: 202, body: {} },
      id: ID,
    });
    assert.deepEqual(f.calls, [
      "POST https://app.test/api/sessions",
      `PUT ${UPLOAD_URL}`,
      `POST https://app.test/api/sessions/${ID}/process`,
    ]);
  });

  it("an unreadable file makes no request", async () => {
    const f = fakeFetch({});
    assert.deepEqual(await upload(f, join(dir, "missing.jsonl")), { kind: "unreadable" });
    assert.deepEqual(f.calls, []);
  });

  it("stops at step ① when there is no upload URL, with the answer and interpretCreate's reading", async () => {
    const f = fakeFetch({ create: { status: 429, body: {}, headers: { "retry-after": "60" } } });
    const result = await upload(f);
    assert.equal(result.kind, "not_created");
    assert.ok(result.kind === "not_created");
    assert.deepEqual(result.answer, { status: 429, body: {}, retryAfter: 60 });
    assert.equal(result.result.exitCode, 1);
    assert.match(result.result.message, /Try again in 1 minute\./);
    assert.equal(f.calls.length, 1);
  });

  it("stops at step ② on a non-2xx PUT, after its one retry", async () => {
    const f = fakeFetch({ put: { status: 500 } });
    assert.deepEqual(await upload(f), { kind: "not_stored", status: 500 });
    assert.equal(f.calls.filter((c) => c.startsWith("PUT")).length, 2);
  });

  it("reports which step's timeout an unanswered request had", async () => {
    const timeout = Object.assign(new Error("timed out"), { name: "TimeoutError" });
    assert.deepEqual(await upload(fakeFetch({ create: timeout })), {
      kind: "unreachable",
      error: "timeout",
      timeoutMs: API_TIMEOUT_MS,
    });
    assert.deepEqual(await upload(fakeFetch({ put: new TypeError("fetch failed") })), {
      kind: "unreachable",
      error: "network",
      timeoutMs: UPLOAD_TIMEOUT_MS,
    });
  });

  it("does not retry step ③", async () => {
    const f = fakeFetch({ process: { status: 500 } });
    const result = await upload(f);
    assert.equal(result.kind, "processed");
    assert.equal(f.calls.filter((c) => c.endsWith("/process")).length, 1);
  });
});
