import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { interpretMe, meRequest, send, unreachable } from "./http.ts";

const REQ = { url: "https://app.test/api/x", init: { method: "GET" } };

/** A fetch that answers with each of `replies` in turn: a status, or an Error to throw. */
function fakeFetch(replies: (number | Error)[]) {
  const calls: RequestInit[] = [];
  const impl = (async (_url: string, init: RequestInit) => {
    calls.push(init);
    const reply = replies[calls.length - 1];
    if (reply instanceof Error) throw reply;
    return new Response(JSON.stringify({ n: calls.length }), { status: reply });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const timeoutError = Object.assign(new Error("timed out"), { name: "TimeoutError" });

describe("send", () => {
  it("passes an abort signal and returns status and body", async () => {
    const f = fakeFetch([200]);
    const res = await send(REQ, { timeoutMs: 1000, retry: true, fetchImpl: f.impl });
    assert.deepEqual(res, { status: 200, body: { n: 1 } });
    assert.ok(f.calls[0]?.signal instanceof AbortSignal);
  });

  it("retries once after a 5xx or a network error when allowed", async () => {
    const opts = { timeoutMs: 1000, retry: true, backoffMs: 0 };
    assert.deepEqual(await send(REQ, { ...opts, fetchImpl: fakeFetch([503, 200]).impl }), {
      status: 200,
      body: { n: 2 },
    });
    assert.deepEqual(
      await send(REQ, { ...opts, fetchImpl: fakeFetch([new TypeError("x"), 201]).impl }),
      { status: 201, body: { n: 2 } },
    );
    const f = fakeFetch([500, 500, 200]);
    assert.equal(
      ((await send(REQ, { ...opts, fetchImpl: f.impl })) as { status: number }).status,
      500,
    );
    assert.equal(f.calls.length, 2);
  });

  it("doesn't retry a 4xx, or anything when retry is off", async () => {
    const f = fakeFetch([409, 200]);
    await send(REQ, { timeoutMs: 1000, retry: true, backoffMs: 0, fetchImpl: f.impl });
    assert.equal(f.calls.length, 1);
    const g = fakeFetch([new TypeError("x"), 200]);
    assert.deepEqual(await send(REQ, { timeoutMs: 1000, retry: false, fetchImpl: g.impl }), {
      error: "network",
    });
    assert.equal(g.calls.length, 1);
  });

  it("reports a timeout apart from other failures", async () => {
    const f = fakeFetch([timeoutError]);
    assert.deepEqual(await send(REQ, { timeoutMs: 1000, retry: false, fetchImpl: f.impl }), {
      error: "timeout",
    });
    assert.match(unreachable("timeout", 15_000), /15 s/);
    assert.doesNotMatch(unreachable("network", 15_000), /--url, then/);
  });
});

describe("login token check", () => {
  it("GETs /api/cli/me with the bearer token", () => {
    const req = meRequest("https://app.test", "sc_x");
    assert.equal(req.url, "https://app.test/api/cli/me");
    assert.equal((req.init.headers as Record<string, string>).authorization, "Bearer sc_x");
  });

  it("accepts a 200 and names the account; refuses anything else", () => {
    const ok = interpretMe(200, { email: "a@b.test" }, "https://app.test");
    assert.equal(ok.exitCode, 0);
    assert.match(ok.message, /as a@b\.test/);
    assert.equal(interpretMe(200, { email: null }, "https://app.test").exitCode, 0);
    assert.match(interpretMe(401, null, "https://app.test").message, /Nothing was saved/);
    assert.equal(interpretMe(500, null, "https://app.test").exitCode, 1);
  });
});
