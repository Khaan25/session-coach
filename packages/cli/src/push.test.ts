import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createRequest,
  firstTimestamp,
  interpretCreate,
  interpretProcess,
  interpretPut,
  processRequest,
  putRequest,
  sessionMetadata,
} from "./push.ts";

const TOKEN = "sc_secrettoken123";
const UPLOAD_URL =
  "https://x.supabase.co/storage/v1/object/upload/sign/sessions/u/s.jsonl.gz?token=abc";
const ID = "5c1e0f0a-3b8e-4c6a-9f1d-2a7b8c9d0e11";

describe("session metadata", () => {
  const log = [
    "not json",
    JSON.stringify({ type: "summary" }),
    JSON.stringify({ type: "user", timestamp: "2026-10-27T10:11:00.000Z" }),
    JSON.stringify({ type: "user", timestamp: "2026-10-27T11:00:00.000Z" }),
  ].join("\n");

  it("takes the first timestamp, skipping malformed and timestamp-less lines", () => {
    assert.equal(firstTimestamp(log), "2026-10-27T10:11:00.000Z");
  });

  it("builds the step-1 body from the file name and gzipped size", () => {
    assert.deepEqual(sessionMetadata(log, "/home/me/.claude/abc-123.jsonl", 42), {
      external_id: "abc-123",
      size_bytes: 42,
      title: null,
      started_at: "2026-10-27T10:11:00.000Z",
    });
  });

  it("omits started_at when no line has a usable timestamp", () => {
    const meta = sessionMetadata('{"timestamp":"nope"}\n{}', "s.jsonl", 10);
    assert.equal("started_at" in meta, false);
    assert.equal(firstTimestamp(""), undefined);
  });
});

describe("requests", () => {
  it("POSTs JSON metadata with the bearer token", () => {
    const req = createRequest("https://app.test", TOKEN, sessionMetadata("", "s.jsonl", 5));
    assert.equal(req.url, "https://app.test/api/sessions");
    assert.equal(req.init.method, "POST");
    assert.equal((req.init.headers as Record<string, string>).authorization, `Bearer ${TOKEN}`);
    assert.deepEqual(JSON.parse(req.init.body as string), {
      external_id: "s",
      size_bytes: 5,
      title: null,
    });
  });

  it("PUTs the raw gzip with no auth header, as storage-js does", () => {
    const req = putRequest(UPLOAD_URL, new Uint8Array([1]));
    const headers = req.init.headers as Record<string, string>;
    assert.equal(req.url, UPLOAD_URL);
    assert.equal(req.init.method, "PUT");
    assert.equal(headers["x-upsert"], "true");
    assert.equal(headers["content-type"], "text/plain;charset=UTF-8");
    assert.equal("authorization" in headers, false);
  });

  it("POSTs to the session's process route", () => {
    const req = processRequest("https://app.test", TOKEN, ID);
    assert.equal(req.url, `https://app.test/api/sessions/${ID}/process`);
    assert.equal(req.init.method, "POST");
  });
});

describe("step 1 responses", () => {
  it("201 uploads", () => {
    assert.deepEqual(interpretCreate(201, { id: ID, upload_url: UPLOAD_URL }), {
      action: "upload",
      id: ID,
      uploadUrl: UPLOAD_URL,
    });
  });

  it("409 with an upload_url uploads again", () => {
    const result = interpretCreate(409, { id: ID, upload_url: UPLOAD_URL });
    assert.equal(result.action, "upload");
  });

  it("409 with only an id says already processed and prints the id", () => {
    const result = interpretCreate(409, { id: ID });
    assert.equal(result.action, "stop");
    assert.ok(result.action === "stop" && /already processed/i.test(result.message));
    assert.ok(result.action === "stop" && result.message.includes(ID));
    assert.ok(result.action === "stop" && result.exitCode === 0);
  });

  const failures: [number, RegExp][] = [
    [401, /session-coach login again/],
    [413, /over 50 MB/],
    [400, /rejected/],
    [500, /HTTP 500/],
  ];
  for (const [status, pattern] of failures) {
    it(`${status} stops with a non-zero exit`, () => {
      const result = interpretCreate(status, { error: "x", field: "size_bytes", id: undefined });
      assert.equal(result.action, "stop");
      assert.ok(result.action === "stop" && pattern.test(result.message));
      assert.ok(result.action === "stop" && result.exitCode === 1);
    });
  }
});

describe("step 2 response", () => {
  it("2xx is fine, anything else asks to run push again", () => {
    assert.equal(interpretPut(200).exitCode, 0);
    const bad = interpretPut(403);
    assert.equal(bad.exitCode, 1);
    assert.match(bad.message, /HTTP 403/);
  });
});

describe("step 3 responses", () => {
  it("202 confirms and prints the session id", () => {
    const out = interpretProcess(202, { id: ID }, ID);
    assert.equal(out.exitCode, 0);
    assert.match(out.message, /^Uploaded\. Cards will appear in the app\./);
    assert.match(out.message, new RegExp(`Session id: ${ID}`));
  });

  it("409 prints the status it reports", () => {
    const out = interpretProcess(409, { id: ID, status: "processing" }, ID);
    assert.match(out.message, /already processing/);
    assert.equal(out.exitCode, 0);
  });

  it("422 says the upload didn't land", () => {
    const out = interpretProcess(422, null, ID);
    assert.match(out.message, /upload didn't land, run push again/i);
    assert.equal(out.exitCode, 1);
  });

  it("maps 401, 413, 404 and 500", () => {
    assert.match(interpretProcess(401, null, ID).message, /session-coach login again/);
    assert.match(interpretProcess(413, null, ID).message, /over 50 MB/);
    assert.match(interpretProcess(404, null, ID).message, /doesn't know/);
    assert.match(interpretProcess(500, null, ID).message, /HTTP 500/);
  });
});

describe("secrets", () => {
  it("no message carries the token or the upload URL", () => {
    const bodies = [null, { id: ID, upload_url: UPLOAD_URL, error: "x", status: "ready" }];
    for (const status of [200, 201, 202, 400, 401, 404, 409, 413, 422, 500]) {
      for (const body of bodies) {
        const create = interpretCreate(status, body);
        const messages = [
          create.action === "stop" ? create.message : "",
          interpretPut(status).message,
          interpretProcess(status, body, ID).message,
        ];
        for (const message of messages) {
          assert.equal(message.includes(TOKEN), false);
          assert.equal(message.includes(UPLOAD_URL), false);
          assert.equal(message.includes("token="), false);
        }
      }
    }
  });
});
