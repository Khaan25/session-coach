import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, it } from "node:test";
import { gunzipSync } from "node:zlib";

import { configPath, saveConfig } from "./config.ts";
import { projectDirName } from "./latest.ts";
import { loadState, saveState, syncPaths } from "./state.ts";
import {
  API_TIMEOUT_MS,
  parseHookInput,
  readStdin,
  runSync,
  SYNC_DEADLINE_MS,
  SYNC_MAX_AGE_MS,
  SYNC_MAX_LOGS,
  SYNC_QUIET_MS,
  UPLOAD_TIMEOUT_MS,
  type SyncDeps,
} from "./sync.ts";

const FAKE_SK = "sk-FAKE0example0key0for0tests0only";
const CWD = "/work/my_project";
const NOW = Date.parse("2026-11-03T12:00:00.000Z");
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

type Request = { method: string; url: string; json: Record<string, string> | null };
type Reply = { status: number; body?: unknown } | Error;
type Handler = (req: Request) => Reply;

/** A healthy server: registers every session, takes the upload, accepts the run. */
const healthy: Handler = ({ method, url, json }) => {
  if (url.endsWith("/api/sessions") && json) {
    const id = json.external_id;
    return { status: 201, body: { id: `id-${id}`, upload_url: `https://storage.test/up/${id}` } };
  }
  if (method === "PUT") return { status: 200 };
  return { status: 202, body: {} };
};

/** A fetch that records each request and answers from `handler`. */
function fakeServer(handler: Handler = healthy) {
  const calls: Request[] = [];
  /** The bodies of the PUTs: the gzipped logs. */
  const puts: Uint8Array[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    if (init.method === "PUT") puts.push(init.body as Uint8Array);
    const json = typeof init.body === "string" ? JSON.parse(init.body) : null;
    const req = { method: init.method ?? "GET", url, json };
    calls.push(req);
    const reply = handler(req);
    if (reply instanceof Error) throw reply;
    return new Response(JSON.stringify(reply.body ?? null), { status: reply.status });
  }) as unknown as typeof fetch;
  return {
    impl,
    calls,
    puts,
    /** The session ids sent to step ①, in order, once each. */
    registered: () => [
      ...new Set(calls.filter((c) => c.json?.external_id).map((c) => c.json?.external_id)),
    ],
    count: (method: string) => calls.filter((c) => c.method === method).length,
  };
}

const timeoutError = Object.assign(new Error("timed out"), { name: "TimeoutError" });

describe("parseHookInput", () => {
  it("reads the current session and folder from the hook's JSON", () => {
    const input = parseHookInput(
      JSON.stringify({
        session_id: "s1",
        cwd: "/w",
        transcript_path: "/h/.claude/projects/p/t1.jsonl",
      }),
    );
    assert.equal(input.cwd, "/w");
    assert.deepEqual([...input.currentIds].sort(), ["s1", "t1"]);
  });

  it("reads a Windows transcript path too", () => {
    const input = parseHookInput(JSON.stringify({ transcript_path: "C:\\Users\\me\\p\\t2.jsonl" }));
    assert.deepEqual([...input.currentIds], ["t2"]);
  });

  it("ignores missing, malformed and mistyped input", () => {
    for (const text of [null, "", "not json", "null", "[]", '{"session_id":5,"cwd":{}}']) {
      const input = parseHookInput(text);
      assert.equal(input.cwd, null, String(text));
      assert.equal(input.currentIds.size, 0, String(text));
    }
  });
});

describe("readStdin", () => {
  it("reads to the end", async () => {
    const stream = new PassThrough();
    const text = readStdin(stream);
    stream.end('{"a":1}');
    assert.equal(await text, '{"a":1}');
  });

  it("gives up waiting on a stream that never ends", async () => {
    const stream = new PassThrough();
    stream.write("partial");
    assert.equal(await readStdin(stream, 20), "partial");
  });

  it("stops at the byte limit on a stream that keeps sending, and lets go of it", async () => {
    const stream = new PassThrough();
    const sender = setInterval(() => stream.write("x".repeat(7)), 1);
    try {
      const text = await readStdin(stream, 5000, 10);
      assert.equal(text, "x".repeat(10), "the last chunk is clipped to fit");
      assert.equal(stream.listenerCount("data"), 0);
      assert.equal(stream.isPaused(), true);
      // Later chunks are ignored: nothing is collected after it finished.
      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.equal(stream.listenerCount("data"), 0);
    } finally {
      clearInterval(sender);
      stream.destroy();
    }
  });

  it("never returns more than the limit from one big chunk", async () => {
    const stream = new PassThrough();
    const text = readStdin(stream, 1000, 10);
    stream.write("y".repeat(500));
    assert.equal((await text).length, 10);
  });
});

describe("the run deadline", () => {
  it("is longer than one slow upload: the upload timeout plus two API calls", () => {
    assert.ok(SYNC_DEADLINE_MS > UPLOAD_TIMEOUT_MS + 2 * API_TIMEOUT_MS);
  });
});

describe("runSync", () => {
  let home: string;
  let projects: string;
  let dir: string;

  beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), "sc-sync-"));
    projects = join(home, ".claude", "projects");
    dir = join(projects, projectDirName(CWD));
    await saveConfig(configPath(home), { token: "sc_testtoken", url: "https://app.test" });
  });
  afterEach(async () => {
    await chmod(join(home, ".session-coach"), 0o700).catch(() => {});
    await rm(home, { recursive: true, force: true });
  });

  /** Writes a log that records `cwd`, last modified `ageMs` before NOW. */
  async function log(id: string, ageMs: number, cwd = CWD, folder = dir) {
    await mkdir(folder, { recursive: true });
    const path = join(folder, `${id}.jsonl`);
    const line = JSON.stringify({ type: "user", cwd, timestamp: "2026-11-01T10:00:00.000Z" });
    await writeFile(path, `${line}\n`);
    const seconds = (NOW - ageMs) / 1000;
    await utimes(path, seconds, seconds);
  }

  /** Runs sync with a fake server, counting what it writes to the console. */
  async function sync(server: ReturnType<typeof fakeServer>, deps: Partial<SyncDeps> = {}) {
    const writes: unknown[][] = [];
    const saved = { ...console };
    for (const name of ["log", "error", "warn", "info", "debug"] as const) {
      console[name] = (...args: unknown[]) => void writes.push(args);
    }
    try {
      await runSync({
        stdin: JSON.stringify({ cwd: CWD }),
        env: {},
        cwd: "/elsewhere",
        home,
        projectsDir: projects,
        now: () => NOW,
        fetchImpl: server.impl,
        backoffMs: 0,
        ...deps,
      });
    } finally {
      Object.assign(console, saved);
    }
    assert.deepEqual(writes, [], "sync must not print");
  }

  const logText = () => readFile(syncPaths(home).log, "utf8").catch(() => "");
  const done = async () => Object.keys((await loadState(syncPaths(home).state)).done);

  it("uploads a finished session through the three steps", async () => {
    await log("a", HOUR);
    const server = fakeServer();
    await sync(server);
    assert.deepEqual(
      server.calls.map((c) => c.method),
      ["POST", "PUT", "POST"],
    );
    assert.equal(server.calls[0]?.url, "https://app.test/api/sessions");
    assert.equal(server.calls[2]?.url, "https://app.test/api/sessions/id-a/process");
    assert.deepEqual(await done(), ["a"]);
    assert.match(await logText(), /1 uploaded, 0 already on the server, 0 failed/);
  });

  it("skips the running session, named by transcript_path or by session_id", async () => {
    for (const id of ["a", "b", "c"]) await log(id, HOUR);
    const server = fakeServer();
    const stdin = JSON.stringify({
      cwd: CWD,
      session_id: "b",
      transcript_path: join(dir, "c.jsonl"),
    });
    await sync(server, { stdin });
    assert.deepEqual(server.registered(), ["a"]);
  });

  it("skips logs older than 7 days", async () => {
    await log("old", SYNC_MAX_AGE_MS + MINUTE);
    await log("edge", SYNC_MAX_AGE_MS - MINUTE);
    const server = fakeServer();
    await sync(server);
    assert.deepEqual(server.registered(), ["edge"]);
  });

  it("leaves a log modified in the last 5 minutes for a later start", async () => {
    await log("busy", SYNC_QUIET_MS - MINUTE);
    await log("idle", SYNC_QUIET_MS + MINUTE);
    const server = fakeServer();
    await sync(server);
    assert.deepEqual(server.registered(), ["idle"]);
  });

  it("uploads one session per start, newest first, and the rest follow on later starts", async () => {
    assert.equal(SYNC_MAX_LOGS, 1);
    for (let i = 1; i <= 3; i++) await log(`l${i}`, i * HOUR);
    for (const expected of ["l1", "l2", "l3"]) {
      const server = fakeServer();
      await sync(server);
      assert.deepEqual(server.registered(), [expected]);
    }
    const last = fakeServer();
    await sync(last);
    assert.deepEqual(last.calls, []);
  });

  it("skips ids in the state file before applying the cap", async () => {
    for (let i = 1; i <= 5; i++) await log(`l${i}`, i * HOUR);
    const at = "2026-11-02T10:00:00.000Z";
    await saveState(syncPaths(home).state, {
      version: 1,
      done: { l1: { outcome: "pushed", at }, l2: { outcome: "failed", at } },
    });
    const server = fakeServer();
    await sync(server);
    assert.deepEqual(server.registered(), ["l3"]);
  });

  it("writes the state after each log, so the next start asks the server about the next one", async () => {
    await log("a", HOUR);
    await log("b", 2 * HOUR);
    await sync(fakeServer());
    assert.deepEqual(await done(), ["a"]);
    const again = fakeServer();
    await sync(again);
    assert.deepEqual(again.registered(), ["b"]);
    assert.deepEqual((await done()).sort(), ["a", "b"]);
  });

  it("works when the state file is deleted or corrupt, and repairs it", async () => {
    await log("a", HOUR);
    await mkdir(join(home, ".session-coach"), { recursive: true });
    await writeFile(syncPaths(home).state, "{corrupt");
    const server = fakeServer();
    await sync(server);
    assert.deepEqual(server.registered(), ["a"]);
    assert.deepEqual(await done(), ["a"]);
  });

  it("treats a 409 with no upload url as already there: quiet, no upload, remembered", async () => {
    await log("a", HOUR);
    const server = fakeServer(({ url }) =>
      url.endsWith("/api/sessions") ? { status: 409, body: { id: "id-a" } } : { status: 500 },
    );
    await sync(server);
    assert.equal(server.calls.length, 1);
    assert.deepEqual(await done(), ["a"]);
    assert.match(await logText(), /0 uploaded, 1 already on the server/);
  });

  it("uploads again on a 409 that carries an upload url", async () => {
    await log("a", HOUR);
    const server = fakeServer((req) =>
      req.url.endsWith("/api/sessions")
        ? { status: 409, body: { id: "id-a", upload_url: "https://storage.test/up/a" } }
        : healthy(req),
    );
    await sync(server);
    assert.deepEqual(
      server.calls.map((c) => c.method),
      ["POST", "PUT", "POST"],
    );
    assert.deepEqual(await done(), ["a"]);
  });

  it("remembers a failed outcome once and never retries it", async () => {
    await log("a", HOUR);
    const server = fakeServer((req) =>
      req.url.endsWith("/process") ? { status: 409, body: { status: "failed" } } : healthy(req),
    );
    await sync(server);
    assert.equal((await loadState(syncPaths(home).state)).done.a?.outcome, "failed");
    assert.match(await logText(), /a: processing failed/);
    const again = fakeServer();
    await sync(again);
    assert.deepEqual(again.calls, []);
  });

  it("remembers a log the server rejects, so it is not sent again", async () => {
    await log("a", HOUR);
    const server = fakeServer(() => ({ status: 400, body: { field: "external_id" } }));
    await sync(server);
    assert.equal((await loadState(syncPaths(home).state)).done.a?.outcome, "failed");
  });

  it("never sends a log recorded in another folder or with no cwd", async () => {
    const shared = join(projects, projectDirName("/work/a-b"));
    await log("theirs", HOUR, "/work/a/b", shared);
    await writeFile(join(shared, "nocwd.jsonl"), `${JSON.stringify({ type: "summary" })}\n`);
    await utimes(join(shared, "nocwd.jsonl"), (NOW - HOUR) / 1000, (NOW - HOUR) / 1000);
    const server = fakeServer();
    await sync(server, { stdin: JSON.stringify({ cwd: "/work/a-b" }) });
    assert.deepEqual(server.calls, []);
  });

  it("uses the process folder when the hook JSON has no cwd", async () => {
    await log("a", HOUR);
    const server = fakeServer();
    await sync(server, { stdin: JSON.stringify({ session_id: "now" }), env: {}, cwd: CWD });
    assert.deepEqual(server.registered(), ["a"]);
  });

  it("uses INIT_CWD over the process folder when there is no stdin", async () => {
    await log("a", HOUR);
    const server = fakeServer();
    await sync(server, { stdin: null, env: { INIT_CWD: CWD }, cwd: "/elsewhere" });
    assert.deepEqual(server.registered(), ["a"]);
  });

  it("finds nothing, and uploads nothing, when no folder points at the project", async () => {
    await log("a", HOUR);
    const server = fakeServer();
    await sync(server, { stdin: "garbage", env: {}, cwd: "/elsewhere" });
    assert.deepEqual(server.calls, []);
  });

  it("scans the given home when no projects folder is passed", async () => {
    await log("a", HOUR);
    const server = fakeServer();
    await sync(server, { projectsDir: undefined });
    assert.deepEqual(server.registered(), ["a"]);
  });

  it("redacts the log before uploading it", async () => {
    await mkdir(dir, { recursive: true });
    const path = join(dir, "a.jsonl");
    const event = {
      type: "user",
      cwd: CWD,
      timestamp: "2026-11-01T10:00:00.000Z",
      message: { role: "user", content: `my key is ${FAKE_SK} please keep it` },
    };
    await writeFile(path, `${JSON.stringify(event)}\n`);
    const seconds = (NOW - HOUR) / 1000;
    await utimes(path, seconds, seconds);

    const server = fakeServer();
    await sync(server);
    assert.equal(server.puts.length, 1);
    const uploaded = gunzipSync(server.puts[0] as Uint8Array).toString("utf8");
    assert.ok(!uploaded.includes(FAKE_SK), "the secret must not leave the machine");
    assert.ok(uploaded.includes("please keep it"), "the rest of the text is still there");
  });

  it("skips a file name the server would refuse, without a request", async () => {
    await log("my log", HOUR);
    const server = fakeServer();
    await sync(server);
    assert.deepEqual(server.calls, []);
  });

  describe("failures are quiet no-ops that remember nothing", () => {
    const cases: [string, Handler, string, number][] = [
      ["a refused token", () => ({ status: 401 }), "token was refused", 1],
      ["the rate limit", () => ({ status: 429 }), "HTTP 429", 1],
      ["a server error (after the retry)", () => ({ status: 500 }), "HTTP 500", 2],
      ["no network", () => new TypeError("fetch failed"), "stopped: network", 2],
      ["a timeout", () => timeoutError, "stopped: timeout", 2],
      [
        "an upload that fails",
        (req) => (req.method === "PUT" ? { status: 500 } : healthy(req)),
        "upload answered HTTP 500",
        3,
      ],
      [
        "a run that can't start",
        (req) => (req.url.endsWith("/process") ? { status: 500 } : healthy(req)),
        "processing answered HTTP 500",
        3,
      ],
    ];
    for (const [name, handler, expected, requests] of cases) {
      it(`ends the run quietly on ${name}`, async () => {
        await log("a", HOUR);
        const server = fakeServer(handler);
        await sync(server);
        assert.equal(server.calls.length, requests);
        assert.deepEqual(server.registered(), ["a"]);
        assert.deepEqual(await done(), []);
        assert.match(await logText(), new RegExp(expected));
      });
    }

    it("does nothing when not signed in", async () => {
      await rm(configPath(home));
      await log("a", HOUR);
      const server = fakeServer();
      await sync(server);
      assert.deepEqual(server.calls, []);
      assert.match(await logText(), /not signed in/);
    });

    it("does nothing when the project has no logs", async () => {
      const server = fakeServer();
      await sync(server);
      assert.deepEqual(server.calls, []);
      assert.equal(await logText(), "");
    });

    it("carries on when the state can't be saved", { skip: process.getuid?.() === 0 }, async () => {
      await log("a", HOUR);
      await mkdir(join(home, ".session-coach"), { recursive: true });
      await chmod(join(home, ".session-coach"), 0o500);
      const server = fakeServer();
      await sync(server);
      assert.deepEqual(server.registered(), ["a"]);
    });

    it("gives up at the deadline and writes no state for the log it cut off", async () => {
      await log("a", HOUR);
      const hang = (() => new Promise(() => {})) as unknown as typeof fetch;
      await sync(fakeServer(), { fetchImpl: hang, deadlineMs: 30 });
      assert.deepEqual(await done(), []);
      assert.match(await logText(), /ran out of time/);
    });
  });
});

describe("session-coach sync (the real command)", () => {
  const CLI = fileURLToPath(new URL("./cli.ts", import.meta.url));
  let home: string;
  let server: Server;
  let url: string;
  let mode: "ok" | "broken";
  let seen: string[];

  /** Runs the CLI as the hook does: no terminal, JSON on stdin, HOME pointing at a temp folder. */
  function runCli(stdin: string) {
    return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
      const child = spawn(
        process.execPath,
        ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", CLI, "sync"],
        { env: { PATH: process.env.PATH, HOME: home, USERPROFILE: home } },
      );
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => (stdout += chunk));
      child.stderr.on("data", (chunk) => (stderr += chunk));
      child.on("close", (code) => resolve({ code, stdout, stderr }));
      child.stdin.end(stdin);
    });
  }

  async function signIn(baseUrl: string) {
    await saveConfig(configPath(home), { token: "sc_testtoken", url: baseUrl });
  }

  beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), "sc-cli-"));
    mode = "ok";
    seen = [];
    server = createServer((req, res) => {
      seen.push(`${req.method} ${req.url}`);
      req.resume();
      req.on("end", () => {
        const body =
          req.method === "POST" && req.url === "/api/sessions"
            ? { id: "id-x", upload_url: `${url}/up/x` }
            : {};
        const ok = req.url === "/api/sessions" ? 201 : req.method === "PUT" ? 200 : 202;
        res.writeHead(mode === "broken" ? 500 : ok, { "content-type": "application/json" });
        res.end(JSON.stringify(body));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const folder = join(home, ".claude", "projects", projectDirName(CWD));
    await mkdir(folder, { recursive: true });
    const path = join(folder, "x.jsonl");
    await writeFile(path, `${JSON.stringify({ type: "user", cwd: CWD })}\n`);
    const old = (Date.now() - HOUR) / 1000;
    await utimes(path, old, old);
  });
  afterEach(async () => {
    server.close();
    await rm(home, { recursive: true, force: true });
  });

  const hook = JSON.stringify({ session_id: "now", cwd: CWD });

  async function assertSilent(stdin = hook) {
    const result = await runCli(stdin);
    assert.deepEqual(result, { code: 0, stdout: "", stderr: "" });
  }

  it("uploads, prints nothing and exits 0", async () => {
    await signIn(url);
    await assertSilent();
    assert.deepEqual(seen, ["POST /api/sessions", "PUT /up/x", "POST /api/sessions/id-x/process"]);
    assert.match(await readFile(syncPaths(home).log, "utf8"), /1 uploaded/);
  });

  it("is silent and exits 0 on a server error", async () => {
    mode = "broken";
    await signIn(url);
    await assertSilent();
    assert.match(await readFile(syncPaths(home).log, "utf8"), /stopped: server answered HTTP 500/);
  });

  it("is silent and exits 0 when the server can't be reached", async () => {
    server.close();
    await signIn(url);
    await assertSilent();
    assert.match(await readFile(syncPaths(home).log, "utf8"), /stopped: network/);
  });

  it("is silent and exits 0 when not signed in", async () => {
    await assertSilent();
    assert.deepEqual(seen, []);
  });

  it("is silent and exits 0 on stdin that isn't JSON, and on none at all", async () => {
    await signIn(url);
    await assertSilent("this is not json");
    await assertSilent("");
  });
});
