import { createHash, randomBytes } from "node:crypto";

// Pure token helpers, so node --test runs them. The upload API must hash a bearer token with hashToken() to find its
// cli_tokens row: the raw token is never stored.

/** Every CLI token starts with this, so a leaked one is recognisable to people and secret scanners. */
export const TOKEN_PREFIX = "sc_";

/** A new raw token: the prefix and 32 random bytes as base64url (43 characters). */
export function newToken(): string {
  return TOKEN_PREFIX + randomBytes(32).toString("base64url");
}

/** The value stored in `cli_tokens.token_hash`: sha256 of the raw token, 64 lowercase hex characters. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
