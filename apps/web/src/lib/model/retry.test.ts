import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_RETRY_WAIT_MS, ProviderHttpError, RETRY_WAIT_MS, retryWaitMs } from "./retry.ts";

const http = (status: number, retryAfter: string | null = null) =>
  new ProviderHttpError("groq", status, retryAfter);

test("a 429 waits for retry-after seconds, capped", () => {
  assert.equal(retryWaitMs(http(429, "3")), 3_000);
  assert.equal(retryWaitMs(http(429, "0")), 0);
  assert.equal(retryWaitMs(http(429, "600")), MAX_RETRY_WAIT_MS);
});

test("a 429 with an HTTP-date retry-after waits until then, capped", () => {
  const now = Date.parse("2026-10-21T07:28:00Z");
  assert.equal(retryWaitMs(http(429, "Wed, 21 Oct 2026 07:28:10 GMT"), now), 10_000);
  assert.equal(retryWaitMs(http(429, "Wed, 21 Oct 2026 08:28:00 GMT"), now), MAX_RETRY_WAIT_MS);
});

test("a 429 with no usable retry-after waits the default", () => {
  assert.equal(retryWaitMs(http(429)), RETRY_WAIT_MS);
  // A date already past, or one that doesn't parse.
  const now = Date.parse("2026-10-21T07:28:00Z");
  assert.equal(retryWaitMs(http(429, "Wed, 21 Oct 2026 07:27:00 GMT"), now), RETRY_WAIT_MS);
  assert.equal(retryWaitMs(http(429, "soon"), now), RETRY_WAIT_MS);
  assert.equal(retryWaitMs(http(429, "-1")), RETRY_WAIT_MS);
  assert.equal(retryWaitMs(http(429, "")), RETRY_WAIT_MS);
  assert.equal(retryWaitMs(http(429, "  ")), RETRY_WAIT_MS);
});

test("other 4xx answers are not retried", () => {
  for (const status of [400, 401, 403, 404, 413, 422])
    assert.equal(retryWaitMs(http(status)), null);
});

test("5xx, timeouts and non-JSON output wait the default", () => {
  assert.equal(retryWaitMs(http(500)), RETRY_WAIT_MS);
  assert.equal(retryWaitMs(http(503)), RETRY_WAIT_MS);
  assert.equal(retryWaitMs(new DOMException("timed out", "TimeoutError")), RETRY_WAIT_MS);
  assert.equal(retryWaitMs(new SyntaxError("Unexpected token")), RETRY_WAIT_MS);
});
