import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  approveUrl,
  clientName,
  deviceStartRequest,
  interpretPoll,
  interpretStart,
  openerFor,
  pollForToken,
  type DeviceStart,
} from "./device.ts";

const URL_BASE = "https://app.test";
const START: DeviceStart = {
  deviceCode: "d".repeat(43),
  userCode: "WDJB-MJHT",
  expiresIn: 600,
  interval: 5,
};

/** A fetch answering each poll with the next [status, body]; records request bodies. */
function fakeFetch(replies: [number, unknown][]) {
  const bodies: unknown[] = [];
  const impl = (async (_url: string, init: RequestInit) => {
    bodies.push(JSON.parse(String(init.body)));
    const [status, body] = replies[bodies.length - 1] ?? [400, { error: "authorization_pending" }];
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { impl, bodies };
}

/** A clock that only moves when the poll loop sleeps, so tests run instantly. */
function fakeClock() {
  let t = 0;
  const sleeps: number[] = [];
  return {
    now: () => t,
    sleep: async (ms: number) => {
      sleeps.push(ms);
      t += ms;
    },
    sleeps,
  };
}

const pending: [number, unknown] = [400, { error: "authorization_pending" }];

describe("pollForToken", () => {
  it("waits through authorization_pending, then returns the token and email", async () => {
    const f = fakeFetch([pending, pending, [200, { token: "sc_abc", email: "sam@example.com" }]]);
    const clock = fakeClock();
    const result = await pollForToken(URL_BASE, START, { fetchImpl: f.impl, ...clock });
    assert.deepEqual(result, { kind: "success", token: "sc_abc", email: "sam@example.com" });
    assert.deepEqual(clock.sleeps, [5000, 5000, 5000]);
    assert.deepEqual(f.bodies[0], { deviceCode: START.deviceCode });
  });

  it("adds 5 s to the interval on each slow_down, and on a 429", async () => {
    const f = fakeFetch([
      [400, { error: "slow_down" }],
      [429, { error: "slow_down" }],
      [200, { token: "sc_x", email: null }],
    ]);
    const clock = fakeClock();
    const result = await pollForToken(URL_BASE, START, { fetchImpl: f.impl, ...clock });
    assert.equal(result.kind, "success");
    assert.deepEqual(clock.sleeps, [5000, 10000, 15000]);
  });

  it("stops on expired_token", async () => {
    const f = fakeFetch([pending, [400, { error: "expired_token" }]]);
    const result = await pollForToken(URL_BASE, START, { fetchImpl: f.impl, ...fakeClock() });
    assert.deepEqual(result, { kind: "expired" });
  });

  it("stops on access_denied", async () => {
    const f = fakeFetch([[400, { error: "access_denied" }]]);
    const result = await pollForToken(URL_BASE, START, { fetchImpl: f.impl, ...fakeClock() });
    assert.deepEqual(result, { kind: "denied" });
  });

  it("gives up as expired at the deadline when nobody answers", async () => {
    const f = fakeFetch([]);
    const clock = fakeClock();
    const result = await pollForToken(
      URL_BASE,
      { ...START, expiresIn: 20 },
      { fetchImpl: f.impl, ...clock },
    );
    assert.deepEqual(result, { kind: "expired" });
    assert.equal(clock.sleeps.length, 4);
  });

  it("keeps polling through a network error and a 5xx", async () => {
    let calls = 0;
    const impl = (async () => {
      calls++;
      if (calls === 1) throw new TypeError("fetch failed");
      if (calls === 2) return new Response("{}", { status: 503 });
      return new Response(JSON.stringify({ token: "sc_ok", email: null }), { status: 200 });
    }) as unknown as typeof fetch;
    const result = await pollForToken(URL_BASE, START, { fetchImpl: impl, ...fakeClock() });
    assert.deepEqual(result, { kind: "success", token: "sc_ok", email: null });
  });
});

describe("interpretPoll", () => {
  it("refuses a 200 without an sc_ token, and an unknown 4xx", () => {
    assert.equal(interpretPoll(200, { token: "nope" }).kind, "error");
    assert.equal(interpretPoll(401, { error: "x" }).kind, "error");
  });
});

describe("interpretStart", () => {
  it("accepts the documented shape", () => {
    assert.deepEqual(
      interpretStart(200, { ...START, verificationUri: "x", verificationUriComplete: "y" }),
      START,
    );
  });

  it("refuses a bad user code, another app's 200 and errors", () => {
    assert.ok("error" in interpretStart(200, { ...START, userCode: "wdjb-mjht; rm" }));
    assert.ok("error" in interpretStart(200, { hello: "world" }));
    assert.ok("error" in interpretStart(429, { error: "x" }));
    assert.ok("error" in interpretStart(500, null));
  });
});

describe("requests and labels", () => {
  it("sends the client name as JSON", () => {
    const req = deviceStartRequest(URL_BASE, "box (Linux)");
    assert.equal(req.url, "https://app.test/api/cli/device");
    assert.deepEqual(JSON.parse(String(req.init.body)), { clientName: "box (Linux)" });
  });

  it("builds the approve URL from our own base URL", () => {
    assert.equal(approveUrl(URL_BASE, "WDJB-MJHT"), "https://app.test/cli/approve?code=WDJB-MJHT");
  });

  it("labels the device by hostname and OS, without control characters, at most 100 characters", () => {
    assert.equal(clientName("sams-mbp", "darwin"), "sams-mbp (macOS)");
    assert.equal(clientName("box\u0007", "linux"), "box (Linux)");
    assert.equal(clientName("", "freebsd"), "Unknown computer (freebsd)");
    assert.ok(clientName("x".repeat(500), "win32").length <= 100);
  });
});

describe("openerFor", () => {
  const page = "https://app.test/cli/approve?code=WDJB-MJHT";

  it("uses each platform's opener with the URL as one argument, never a shell", () => {
    assert.deepEqual(openerFor(page, "darwin"), ["open", [page]]);
    assert.deepEqual(openerFor(page, "linux"), ["xdg-open", [page]]);
    assert.deepEqual(openerFor(page, "win32"), ["rundll32", ["url.dll,FileProtocolHandler", page]]);
  });

  it("re-serialises the URL, so shell metacharacters can't break out on Windows", () => {
    const opened = openerFor('https://app.test/a b"&calc|x^%PATH%', "win32");
    assert.ok(opened);
    assert.equal(opened[0], "rundll32");
    assert.doesNotMatch(opened[1][1] ?? "", /[\s"]/);
  });

  it("refuses anything that isn't http(s)", () => {
    assert.equal(openerFor("file:///etc/passwd", "darwin"), null);
    assert.equal(openerFor("javascript:alert(1)", "win32"), null);
    assert.equal(openerFor("not a url", "linux"), null);
  });
});

describe("pollForToken interval cap", () => {
  it("never waits longer than the server's 60 s ceiling", async () => {
    const slow: [number, unknown] = [400, { error: "slow_down" }];
    const f = fakeFetch([slow, slow, slow, [200, { token: "sc_x", email: null }]]);
    const clock = fakeClock();
    const result = await pollForToken(
      URL_BASE,
      { ...START, interval: 50 },
      {
        fetchImpl: f.impl,
        ...clock,
      },
    );
    assert.equal(result.kind, "success");
    assert.deepEqual(clock.sleeps, [50_000, 55_000, 60_000, 60_000]);
  });
});
