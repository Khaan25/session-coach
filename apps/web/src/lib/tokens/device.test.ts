import assert from "node:assert/strict";
import { test } from "node:test";

import { MAX_POLL_INTERVAL_SECONDS } from "@session-coach/shared/limits";

import {
  codeState,
  clientNameSchema,
  devicePollSchema,
  formatUserCode,
  isSameOrigin,
  newDeviceCode,
  newUserCode,
  normalizeUserCode,
  pollOutcome,
  slowerInterval,
  USER_CODE_ALPHABET,
} from "./device.ts";

const NOW = new Date("2026-11-04T12:00:00Z");
const at = (seconds: number) => new Date(NOW.getTime() + seconds * 1000).toISOString();

const pending = {
  expires_at: at(300),
  approved_at: null,
  denied_at: null,
  token_issued_at: null,
  last_polled_at: null,
  poll_interval: 5,
};

test("newDeviceCode is 32 random bytes as base64url and passes the poll schema", () => {
  const code = newDeviceCode();
  assert.match(code, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(newDeviceCode(), code);
  assert.ok(devicePollSchema.safeParse({ deviceCode: code }).success);
});

test("newUserCode is 8 letters from the unambiguous alphabet, and every letter turns up", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 500; i++) {
    const code = newUserCode();
    assert.match(code, /^[BCDFGHJKLMNPQRSTVWXZ]{8}$/);
    for (const letter of code) seen.add(letter);
  }
  assert.equal(seen.size, USER_CODE_ALPHABET.length);
  assert.doesNotMatch(USER_CODE_ALPHABET, /[AEIOUY01]/);
});

test("formatUserCode and normalizeUserCode round-trip XXXX-XXXX", () => {
  assert.equal(formatUserCode("WDJBMJHT"), "WDJB-MJHT");
  assert.equal(normalizeUserCode("WDJB-MJHT"), "WDJBMJHT");
  assert.equal(normalizeUserCode(" wdjb mjht "), "WDJBMJHT");
  assert.equal(normalizeUserCode(formatUserCode("BCDFGHJK")), "BCDFGHJK");
});

test("normalizeUserCode refuses wrong length, letters outside the alphabet and long input", () => {
  for (const bad of [
    "",
    null,
    undefined,
    "WDJB-MJH",
    "WDJB-MJHTX",
    "ABCD-EFGH",
    "WDJB-MJH1",
    "x".repeat(40),
  ]) {
    assert.equal(normalizeUserCode(bad), null, String(bad));
  }
});

test("clientNameSchema trims, caps at 100 and refuses control characters", () => {
  assert.equal(clientNameSchema.parse("  mac on darwin "), "mac on darwin");
  assert.ok(!clientNameSchema.safeParse("").success);
  assert.ok(!clientNameSchema.safeParse("x".repeat(101)).success);
  assert.ok(!clientNameSchema.safeParse("mac\u001b[31m").success);
  assert.ok(!clientNameSchema.safeParse("mac\nevil").success);
});

test("devicePollSchema refuses short or non-base64url codes", () => {
  assert.ok(!devicePollSchema.safeParse({ deviceCode: "short" }).success);
  assert.ok(!devicePollSchema.safeParse({ deviceCode: `${"a".repeat(40)}==` }).success);
  assert.ok(!devicePollSchema.safeParse({ deviceCode: "a".repeat(129) }).success);
});

test("codeState: pending, expired, approved, denied, used", () => {
  assert.equal(codeState(pending, NOW), "pending");
  assert.equal(codeState({ ...pending, expires_at: at(0) }, NOW), "expired");
  assert.equal(codeState({ ...pending, approved_at: at(-10) }, NOW), "approved");
  // A decision outlives expiry, so the page can still say what happened.
  assert.equal(
    codeState({ ...pending, expires_at: at(-1), approved_at: at(-10) }, NOW),
    "approved",
  );
  assert.equal(codeState({ ...pending, denied_at: at(-10) }, NOW), "denied");
  assert.equal(
    codeState({ ...pending, approved_at: at(-10), token_issued_at: at(-5) }, NOW),
    "used",
  );
});

test("pollOutcome: pending until approved, then issue", () => {
  assert.equal(pollOutcome(pending, NOW), "authorization_pending");
  assert.equal(pollOutcome({ ...pending, last_polled_at: at(-5) }, NOW), "authorization_pending");
  assert.equal(pollOutcome({ ...pending, approved_at: at(-1) }, NOW), "issue");
});

test("pollOutcome: slow_down when polled inside the interval, with 1 s of jitter allowed", () => {
  assert.equal(pollOutcome({ ...pending, last_polled_at: at(-2) }, NOW), "slow_down");
  assert.equal(pollOutcome({ ...pending, last_polled_at: at(-4) }, NOW), "authorization_pending");
  assert.equal(
    pollOutcome({ ...pending, poll_interval: 10, last_polled_at: at(-6) }, NOW),
    "slow_down",
  );
  assert.equal(
    pollOutcome({ ...pending, approved_at: at(-1), last_polled_at: at(-1) }, NOW),
    "slow_down",
  );
});

test("pollOutcome: final states win over slow_down", () => {
  assert.equal(
    pollOutcome({ ...pending, denied_at: at(-1), last_polled_at: at(-1) }, NOW),
    "access_denied",
  );
  assert.equal(pollOutcome({ ...pending, expires_at: at(0) }, NOW), "expired_token");
  assert.equal(
    pollOutcome({ ...pending, expires_at: at(-1), approved_at: at(-30) }, NOW),
    "expired_token",
  );
  // One-time: a code whose token went out never issues again.
  assert.equal(
    pollOutcome({ ...pending, approved_at: at(-30), token_issued_at: at(-20) }, NOW),
    "expired_token",
  );
});

test("isSameOrigin: Origin must match exactly; without it, only Sec-Fetch-Site same-origin passes", () => {
  const site = "https://coach.example.org";
  const h = (init: Record<string, string>) => new Headers(init);
  assert.ok(isSameOrigin(h({ origin: site }), site));
  assert.ok(!isSameOrigin(h({ origin: "https://evil.example" }), site));
  assert.ok(!isSameOrigin(h({ origin: "null" }), site));
  assert.ok(!isSameOrigin(h({ origin: `${site}.evil.example` }), site));
  assert.ok(isSameOrigin(h({ "sec-fetch-site": "same-origin" }), site));
  assert.ok(!isSameOrigin(h({ "sec-fetch-site": "cross-site" }), site));
  assert.ok(!isSameOrigin(h({}), site));
});

test("slowerInterval adds 5 s, capped at the column's maximum", () => {
  assert.equal(slowerInterval(5), 10);
  assert.equal(slowerInterval(58), MAX_POLL_INTERVAL_SECONDS);
});
