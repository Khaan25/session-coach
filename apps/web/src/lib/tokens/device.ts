import { randomBytes, randomInt } from "node:crypto";

import { MAX_POLL_INTERVAL_SECONDS, SLOW_DOWN_STEP_SECONDS } from "@session-coach/shared/limits";
import { z } from "zod";

// Device-code login (RFC 8628): codes, their format and the state rules the routes and /cli/approve share. Pure, so
// node --test runs it.

/** Consonants without look-alikes (no vowels, so no words; no I/O/Y/U), the alphabet RFC 8628 section 6.1 suggests. */
export const USER_CODE_ALPHABET = "BCDFGHJKLMNPQRSTVWXZ";

/** How long a code lives, and the poll interval the CLI starts with. */
export const DEVICE_CODE_TTL_SECONDS = 600;
export const POLL_INTERVAL_SECONDS = 5;

/** The secret the CLI polls with: 32 random bytes, base64url (43 characters). Only its sha256 is stored. */
export function newDeviceCode(): string {
  return randomBytes(32).toString("base64url");
}

/** 8 letters from `USER_CODE_ALPHABET`, uniform (randomInt has no modulo bias). Stored without the dash. */
export function newUserCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) code += USER_CODE_ALPHABET[randomInt(USER_CODE_ALPHABET.length)];
  return code;
}

/** XXXX-XXXX, how the code is shown and typed. */
export function formatUserCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * What a learner typed, as stored: upper case, dashes and spaces dropped. Null unless it is 8 letters from the
 * alphabet, so a bad code never reaches a query.
 */
export function normalizeUserCode(input: string | null | undefined): string | null {
  if (!input || input.length > 32) return null;
  const code = input.toUpperCase().replace(/[\s-]/g, "");
  return new RegExp(`^[${USER_CODE_ALPHABET}]{8}$`).test(code) ? code : null;
}

/** The device label the CLI sends: printable text, 1 to 100 characters. */
export const clientNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[^\p{C}]+$/u, "no control characters");

export const deviceStartSchema = z.object({ clientName: clientNameSchema });

/** The polled device code: base64url, 43 characters from `newDeviceCode`; a little slack, never unbounded. */
export const devicePollSchema = z.object({
  deviceCode: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/),
});

export const userCodeSchema = z.object({ userCode: z.string().max(32) });

/** The row columns the routes and the approve page read. Never device_code_hash. */
export const DEVICE_COLUMNS =
  "id, user_code, client_name, requested_ip, requested_at, expires_at, poll_interval, approved_by, approved_at, denied_at, token_issued_at, last_polled_at";

export type DeviceRow = {
  id: string;
  user_code: string;
  client_name: string;
  requested_ip: string | null;
  requested_at: string;
  expires_at: string;
  poll_interval: number;
  approved_by: string | null;
  approved_at: string | null;
  denied_at: string | null;
  token_issued_at: string | null;
  last_polled_at: string | null;
};

/** Where a code stands, for the approve page and the approve/deny routes. */
export type CodeState = "pending" | "approved" | "denied" | "used" | "expired";

/**
 * A code's state at `now`. A decision outlives expiry (the page still says "approved"), but an undecided code that ran
 * out of time is expired.
 */
export function codeState(
  row: Pick<DeviceRow, "expires_at" | "approved_at" | "denied_at" | "token_issued_at">,
  now: Date,
): CodeState {
  if (row.token_issued_at) return "used";
  if (row.denied_at) return "denied";
  if (row.approved_at) return "approved";
  if (Date.parse(row.expires_at) <= now.getTime()) return "expired";
  return "pending";
}

/** The answer to one poll, by RFC 8628 section 3.5 error code, or "issue" when the token may be handed over. */
export type PollOutcome =
  | "authorization_pending"
  | "slow_down"
  | "expired_token"
  | "access_denied"
  | "issue";

/**
 * What one poll gets. Final states first (a denied or spent code never says "slow down"), then the interval, then
 * whether the learner approved. A code past its expiry is expired even if approved: the CLI should have collected it.
 */
export function pollOutcome(
  row: Pick<
    DeviceRow,
    | "expires_at"
    | "approved_at"
    | "denied_at"
    | "token_issued_at"
    | "last_polled_at"
    | "poll_interval"
  >,
  now: Date,
): PollOutcome {
  if (row.denied_at) return "access_denied";
  if (row.token_issued_at || Date.parse(row.expires_at) <= now.getTime()) return "expired_token";
  // 1 s of slack: network jitter can land two on-time polls closer together than the interval.
  if (
    row.last_polled_at &&
    now.getTime() - Date.parse(row.last_polled_at) < row.poll_interval * 1000 - 1000
  ) {
    return "slow_down";
  }
  return row.approved_at ? "issue" : "authorization_pending";
}

/**
 * CSRF guard for approve and deny: the browser's Origin must be this site. Without Origin (some older browsers on
 * same-origin requests), Sec-Fetch-Site must say same-origin. Anything else is refused, never assumed safe.
 *
 * @param headers - The request headers.
 * @param origin - This deployment's origin, from the request URL.
 */
export function isSameOrigin(headers: Pick<Headers, "get">, origin: string): boolean {
  const sent = headers.get("origin");
  if (sent) return sent === origin;
  return headers.get("sec-fetch-site") === "same-origin";
}

/** The interval after a slow_down, capped by the column's check. */
export function slowerInterval(current: number): number {
  return Math.min(current + SLOW_DOWN_STEP_SECONDS, MAX_POLL_INTERVAL_SECONDS);
}
