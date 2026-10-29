import assert from "node:assert/strict";
import { test } from "node:test";

import { hashToken, newToken, TOKEN_PREFIX } from "./hash.ts";

test("newToken is the prefix plus 32 random bytes as base64url", () => {
  const token = newToken();
  assert.ok(token.startsWith(TOKEN_PREFIX));
  assert.match(token.slice(TOKEN_PREFIX.length), /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(newToken(), token);
});

test("hashToken is sha256 hex: 64 characters, stable, never the token", () => {
  const token = newToken();
  const hash = hashToken(token);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(hashToken(token), hash);
  assert.notEqual(hash, token);
  assert.notEqual(hashToken(newToken()), hash);
});

test("hashToken matches the known sha256 of a fixed input", () => {
  assert.equal(
    hashToken("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});
