import { createHmac } from "node:crypto";

import { constantTimeEqual } from "../auth/constant-time.ts";

// One-click unsubscribe (RFC 8058) without a login: the link carries the learner's id and an HMAC of it, so only this
// server can mint one. Keyed with CRON_SECRET, which every email-sending deployment already has; the "unsubscribe:"
// prefix keeps these MACs from ever matching another use of that secret. Rotating CRON_SECRET voids links in old emails.

/**
 * The signature for one learner's link: HMAC-SHA256 of their id, base64url.
 *
 * @param userId - The learner's `profiles.id`.
 * @param secret - `process.env.CRON_SECRET`.
 */
export function unsubscribeToken(userId: string, secret: string): string {
  return createHmac("sha256", secret).update(`unsubscribe:${userId}`).digest("base64url");
}

/**
 * Whether `token` is this server's signature for `userId`, compared in constant time.
 *
 * @param userId - The `u` query value.
 * @param token - The `t` query value.
 * @param secret - `process.env.CRON_SECRET`; unset or empty lets nobody through.
 */
export function unsubscribeTokenValid(
  userId: string,
  token: string,
  secret: string | undefined,
): boolean {
  if (!secret) return false;
  return constantTimeEqual(token, unsubscribeToken(userId, secret));
}

/**
 * The learner's one-click link: `<site>/api/unsubscribe?u=<id>&t=<token>`.
 *
 * @param siteUrl - The deployed origin, without a trailing slash.
 * @param userId - The learner's `profiles.id`.
 * @param secret - `process.env.CRON_SECRET`.
 */
export function unsubscribeUrl(siteUrl: string, userId: string, secret: string): string {
  const url = new URL("/api/unsubscribe", siteUrl);
  url.searchParams.set("u", userId);
  url.searchParams.set("t", unsubscribeToken(userId, secret));
  return url.toString();
}

/**
 * The RFC 8058 headers: mail clients show an Unsubscribe button and POST `List-Unsubscribe=One-Click` to the link.
 *
 * @param url - From `unsubscribeUrl`.
 */
export function listUnsubscribeHeaders(url: string): Record<string, string> {
  return { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
}
