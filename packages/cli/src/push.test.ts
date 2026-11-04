import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gunzipSync } from "node:zlib";

// This test crosses packages on purpose: the CLI's output must stay readable by the server parser.
import { parseSession } from "../../../apps/web/src/lib/pipeline/parser.ts";
import {
  createRequest,
  firstTimestamp,
  interpretCreate,
  interpretProcess,
  interpretPut,
  prepareLog,
  redactLog,
  processRequest,
  putRequest,
  sessionMetadata,
  sessionWhere,
  validateFileName,
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
      repo: null,
      branch: null,
      started_at: "2026-10-27T10:11:00.000Z",
    });
  });

  it("takes repo from the first working folder and branch from the last one in the log", () => {
    const where = [
      JSON.stringify({ type: "user", cwd: "/Users/me/Developer/session-coach", gitBranch: "main" }),
      JSON.stringify({ type: "user", cwd: "/Users/me/elsewhere", gitBranch: "" }),
      "not json",
      JSON.stringify({ type: "user", gitBranch: "kasam/project-data" }),
      JSON.stringify({ type: "user", gitBranch: "  " }),
    ].join("\n");
    assert.deepEqual(sessionWhere(where), { repo: "session-coach", branch: "kasam/project-data" });
    const meta = sessionMetadata(where, "s.jsonl", 1);
    assert.equal(meta.repo, "session-coach");
    assert.equal(meta.branch, "kasam/project-data");
  });

  it("reads Windows folders and ignores trailing separators", () => {
    const windows = JSON.stringify({ cwd: "C:\\Users\\me\\billing-api\\" });
    assert.equal(sessionWhere(windows).repo, "billing-api");
    assert.equal(sessionWhere('{"cwd":"/home/me/rapporteur/"}').repo, "rapporteur");
  });

  it("gives null repo and branch when the log has neither, and caps them at the schema limit", () => {
    assert.deepEqual(sessionWhere('{"cwd":42,"gitBranch":null}\n{}'), { repo: null, branch: null });
    assert.deepEqual(sessionWhere(""), { repo: null, branch: null });
    const long = "x".repeat(300);
    const where = sessionWhere(JSON.stringify({ cwd: `/a/${long}`, gitBranch: long }));
    assert.equal(where.repo?.length, 200);
    assert.equal(where.branch?.length, 200);
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
      repo: null,
      branch: null,
    });
  });

  it("PUTs the raw gzip with no auth header, as storage-js does", () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const req = putRequest(UPLOAD_URL, bytes);
    const headers = req.init.headers as Record<string, string>;
    assert.equal(req.url, UPLOAD_URL);
    assert.equal(req.init.method, "PUT");
    assert.equal(headers["x-upsert"], "true");
    assert.equal(headers["content-type"], "text/plain;charset=UTF-8");
    assert.equal("authorization" in headers, false);
    assert.deepEqual(req.init.body, bytes);
  });

  it("POSTs to the session's process route", () => {
    const req = processRequest("https://app.test", TOKEN, ID);
    assert.equal(req.url, `https://app.test/api/sessions/${ID}/process`);
    assert.equal(req.init.method, "POST");
    const headers = req.init.headers as Record<string, string>;
    assert.equal(headers.authorization, `Bearer ${TOKEN}`);
  });
});

describe("file name and bytes", () => {
  it("accepts the server's pattern, with or without .jsonl and a directory", () => {
    assert.equal(
      validateFileName("5c1e0f0a-3b8e_4c6a.jsonl".replace(".jsonl", "") + ".jsonl"),
      null,
    );
    assert.equal(validateFileName("/home/me/.claude/abc-123_X.jsonl"), null);
    assert.equal(validateFileName(`${"a".repeat(128)}.jsonl`), null);
  });

  it("rejects other characters and names over 128 characters, with the rename hint", () => {
    const hint = "Rename the file to letters, numbers, - and _ only (max 128 characters).";
    assert.equal(validateFileName("my session.jsonl"), hint);
    assert.equal(validateFileName("a.b.jsonl"), hint);
    assert.equal(validateFileName(`${"a".repeat(129)}.jsonl`), hint);
    assert.equal(validateFileName(".jsonl"), hint);
  });
});

const FAKE_SK = "sk-FAKE0example0key0for0tests0only";
const FAKE_EMAIL = "jane.doe@example.com";

const secretLog = [
  JSON.stringify({
    type: "user",
    timestamp: "2026-10-27T10:11:00.000Z",
    message: { role: "user", content: `mail ${FAKE_EMAIL}, key ${FAKE_SK}` },
  }),
  "",
  JSON.stringify({
    type: "user",
    n: 3,
    ok: true,
    nothing: null,
    message: {
      content: [
        { type: "tool_result", content: `say "hi"\\path\nkey ${FAKE_SK} in /Users/jane/app` },
      ],
    },
  }),
  `not json, but ${FAKE_SK} and ${FAKE_EMAIL}`,
].join("\n");

describe("redaction before upload", () => {
  const { gzipped } = prepareLog(Buffer.from(secretLog));
  const sent = putRequest(UPLOAD_URL, gzipped).init.body as Uint8Array;
  const out = gunzipSync(sent).toString("utf8");

  it("the bytes sent contain neither the key nor the email", () => {
    assert.equal(out.includes(FAKE_SK), false);
    assert.equal(out.includes(FAKE_EMAIL), false);
    assert.equal(out.includes("/Users/jane"), false);
  });

  it("every line that was JSON still parses, and non-string values are unchanged", () => {
    const lines = out.split("\n");
    assert.equal(lines.length, 4);
    assert.equal(lines[1], "");
    const first = JSON.parse(lines[0] as string);
    assert.equal(first.message.content, "mail [EMAIL], key [REDACTED]");
    assert.equal(first.timestamp, "2026-10-27T10:11:00.000Z");
    const second = JSON.parse(lines[2] as string);
    assert.deepEqual([second.n, second.ok, second.nothing], [3, true, null]);
    assert.equal(second.message.content[0].content, 'say "hi"\\path\nkey [REDACTED] in ~/app');
  });

  it("keeps an unparseable line in place, redacted as plain text", () => {
    assert.equal(out.split("\n")[3], "not json, but [REDACTED] and [EMAIL]");
  });

  it("only string values are redacted, not keys", () => {
    const key = `${FAKE_EMAIL}`;
    assert.deepEqual(JSON.parse(redactLog(JSON.stringify({ [key]: FAKE_EMAIL }))), {
      [key]: "[EMAIL]",
    });
  });

  it("the metadata sees the redacted text", () => {
    const { text } = prepareLog(Buffer.from(secretLog));
    assert.equal(firstTimestamp(text), "2026-10-27T10:11:00.000Z");
  });

  it("an invalid UTF-8 byte arrives as U+FFFD, and the rest of the line is kept", () => {
    const bytes = Buffer.concat([
      Buffer.from('{"a":"x'),
      Buffer.from([0xff]),
      Buffer.from('y"}\n'),
    ]);
    assert.equal(gunzipSync(prepareLog(bytes).gzipped).toString("utf8"), '{"a":"x\ufffdy"}\n');
  });
});

describe("redaction keeps the log's structure", () => {
  // All ids are invented. The Read's id is uuid-shaped, which the long-token rule would otherwise redact.
  const READ_ID = "3f2b8c1e-5a4d-4e7b-9c3a-1d2e3f4a5b6c";
  const BASH_ID = "toolu_01XUWkYBQ6Z4JqTgGdYSBjPQ";
  // 36 characters of letters and digits: the long-token rule would redact this outside the exemption.
  const REQUEST_ID = "req_011CTwxYzAbCdEfGhIjKlMnOpQrStUvW";
  const base = {
    uuid: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
    parentUuid: "1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
    sessionId: "5c1e0f0a-3b8e-4c6a-9f1d-2a7b8c9d0e11",
    timestamp: "2026-11-01T12:34:56.789Z",
  };
  const original = [
    { ...base, type: "user", message: { role: "user", content: "read the file" } },
    {
      ...base,
      type: "assistant",
      requestId: REQUEST_ID,
      message: {
        id: "msg_01ABCdefGHIjklMNOpqrSTUv",
        role: "assistant",
        content: [
          { type: "tool_use", id: READ_ID, name: "Read", input: { file_path: "/proj/a.ts" } },
          { type: "tool_use", id: BASH_ID, name: "Bash", input: { command: "ls" } },
        ],
      },
    },
    {
      ...base,
      type: "user",
      message: {
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: READ_ID, content: "file body, dropped" },
          { type: "tool_result", tool_use_id: BASH_ID, content: "a.ts" },
        ],
      },
    },
  ]
    .map((event) => JSON.stringify(event))
    .join("\n");

  it("parseSession finds the same events before and after redaction", () => {
    const before = parseSession(original);
    const after = parseSession(redactLog(original));
    assert.equal(after.events.length, before.events.length);
    assert.deepEqual(
      after.events.filter((e) => e.kind === "result").map((e) => e.text),
      before.events.filter((e) => e.kind === "result").map((e) => e.text),
    );
    assert.deepEqual(after.events, before.events);
  });

  it("leaves the structural fields exactly as they were", () => {
    const [first, second, third] = redactLog(original)
      .split("\n")
      .map((line) => JSON.parse(line));
    for (const event of [first, second, third]) {
      for (const key of ["uuid", "parentUuid", "sessionId", "timestamp"]) {
        assert.equal(event[key], base[key as keyof typeof base]);
      }
    }
    assert.equal(second.requestId, REQUEST_ID);
    assert.equal(second.message.content[0].id, READ_ID);
    assert.equal(third.message.content[0].tool_use_id, READ_ID);
  });

  it("still redacts a secret under a non-structural key", () => {
    const line = JSON.stringify({ uuid: READ_ID, note: `key ${FAKE_SK}` });
    assert.deepEqual(JSON.parse(redactLog(line)), { uuid: READ_ID, note: "key [REDACTED]" });
  });

  it("redacts structural-looking keys outside the structural locations", () => {
    const bad = `${FAKE_SK} ${FAKE_EMAIL}`;
    const want = "[REDACTED] [EMAIL]";
    const nested = { id: bad, role: bad, type: bad, timestamp: bad, uuid: bad };
    const event = {
      ...base,
      type: "assistant",
      id: bad, // top-level id is not structural
      message: {
        id: "msg_01ABCdefGHIjklMNOpqrSTUv",
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: BASH_ID,
            name: "Bash",
            input: { ...nested, deep: { ...nested } },
          },
          { type: "tool_result", tool_use_id: BASH_ID, content: [{ ...nested }] },
          { type: "text", id: bad, tool_use_id: bad, text: "hi" },
        ],
      },
      toolUseResult: { ...nested },
    };
    const out = JSON.parse(redactLog(JSON.stringify(event)));
    const redacted = { id: want, role: want, type: want, timestamp: want, uuid: want };
    const [use, result, text] = out.message.content;
    assert.deepEqual(use.input, { ...redacted, deep: redacted });
    assert.deepEqual(result.content, [redacted]);
    assert.deepEqual(out.toolUseResult, redacted);
    assert.equal(out.id, want);
    assert.equal(text.id, want);
    assert.equal(text.tool_use_id, want);
    // The real structural fields at the known locations come through unchanged.
    assert.equal(use.id, BASH_ID);
    assert.equal(use.type, "tool_use");
    assert.equal(result.tool_use_id, BASH_ID);
    assert.equal(out.message.id, event.message.id);
    assert.equal(out.message.role, "assistant");
    for (const key of Object.keys(base)) assert.equal(out[key], event[key as keyof typeof base]);
  });

  it("redacts a secret in a message field that is not id, role or type", () => {
    const line = JSON.stringify({ type: "user", message: { role: "user", model: FAKE_SK } });
    assert.deepEqual(JSON.parse(redactLog(line)), {
      type: "user",
      message: { role: "user", model: "[REDACTED]" },
    });
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

  it("409 with only an id is neutral, prints the id and exits 0", () => {
    const result = interpretCreate(409, { id: ID });
    assert.equal(result.action, "stop");
    assert.ok(
      result.action === "stop" &&
        result.message.startsWith(
          "This session was already uploaded and is ready or processing. Open the app to see it.",
        ),
    );
    assert.ok(result.action === "stop" && result.message.includes(ID));
    assert.ok(result.action === "stop" && result.exitCode === 0);
  });

  const failures: [number, RegExp][] = [
    [401, /session-coach login again/],
    [413, /over 50 MB/],
    [429, /Wait a while/],
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

  it("409 exits 1 when the session failed and 0 when it is ready", () => {
    assert.equal(interpretProcess(409, { id: ID, status: "failed" }, ID).exitCode, 1);
    assert.equal(interpretProcess(409, { id: ID, status: "ready" }, ID).exitCode, 0);
  });

  it("422 says the upload didn't land", () => {
    const out = interpretProcess(422, null, ID);
    assert.match(out.message, /upload didn't land, run push again/i);
    assert.equal(out.exitCode, 1);
  });

  it("503 shows the server's reason, or the generic line without one", () => {
    const reason =
      "This is switched off until rate limits are set up on our side. Try again later.";
    const out = interpretProcess(503, { error: reason }, ID);
    assert.equal(out.message, reason);
    assert.equal(out.exitCode, 1);
    assert.match(interpretProcess(503, null, ID).message, /HTTP 503/);
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

describe("429 with Retry-After", () => {
  it("says when to try again, in the server's wording", () => {
    const create = interpretCreate(429, { error: "x" }, 120);
    assert.ok(create.action === "stop");
    assert.equal(
      create.message,
      "Too many requests to the server in the last hour. Try again in 2 minutes.",
    );
    assert.match(interpretProcess(429, null, ID, 30).message, /Try again in 1 minute\.$/);
    assert.match(interpretProcess(429, null, ID).message, /Wait a while/);
  });
});
