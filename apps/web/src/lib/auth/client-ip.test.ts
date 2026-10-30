import assert from "node:assert/strict";
import { test } from "node:test";
import { clientIp } from "./client-ip.ts";

test("prefers x-real-ip", () => {
  const headers = new Headers({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" });
  assert.equal(clientIp(headers), "203.0.113.7");
});

test("falls back to the first x-forwarded-for hop", () => {
  const headers = new Headers({ "x-forwarded-for": " 198.51.100.1 , 10.0.0.1" });
  assert.equal(clientIp(headers), "198.51.100.1");
});

test("reads 'unknown' when neither header is set", () => {
  assert.equal(clientIp(new Headers()), "unknown");
  assert.equal(clientIp(new Headers({ "x-forwarded-for": " " })), "unknown");
});
