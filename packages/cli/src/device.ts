// `session-coach login` without a token: the device-code flow (RFC 8628). The CLI asks the server for a code, opens
// the approve page and polls until the learner approves or denies it. No message here carries the device code or the
// token.

import { spawn } from "node:child_process";
import { hostname, platform } from "node:os";

import { MAX_POLL_INTERVAL_SECONDS, SLOW_DOWN_STEP_SECONDS } from "@session-coach/shared/limits";

import { send } from "./http.ts";
import type { HttpRequest } from "./push.ts";

/** What POST /api/cli/device returns. */
export type DeviceStart = {
  deviceCode: string;
  /** XXXX-XXXX. */
  userCode: string;
  expiresIn: number;
  interval: number;
};

export type PollResult =
  | { kind: "success"; token: string; email: string | null }
  | { kind: "expired" }
  | { kind: "denied" }
  | { kind: "error"; message: string };

const USER_CODE = /^[A-Z]{4}-[A-Z]{4}$/;

/** The device label /setup shows: this computer's hostname and OS, within the server's 100-character limit. */
export function clientName(host: string = hostname(), os: string = platform()): string {
  const name = OS_NAMES[os] ?? os;
  // Control characters would be refused by the server; a hostname shouldn't have any, but strip them anyway.
  const cleanHost = host.replace(/\p{C}/gu, "").trim().slice(0, 80) || "Unknown computer";
  return `${cleanHost} (${name})`;
}

const OS_NAMES: Record<string, string> = { darwin: "macOS", win32: "Windows", linux: "Linux" };

export function deviceStartRequest(baseUrl: string, name: string): HttpRequest {
  return {
    url: `${baseUrl}/api/cli/device`,
    init: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientName: name }),
    },
  };
}

export function deviceTokenRequest(baseUrl: string, deviceCode: string): HttpRequest {
  return {
    url: `${baseUrl}/api/cli/device/token`,
    init: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceCode }),
    },
  };
}

/**
 * The start response, checked: another app answering at that URL, or a code in the wrong shape, is an error.
 *
 * @returns The start, or `{ error }` to print.
 */
export function interpretStart(status: number, body: unknown): DeviceStart | { error: string } {
  const b = (body ?? {}) as Partial<Record<keyof DeviceStart, unknown>> & { error?: unknown };
  if (status === 429) return { error: "Too many logins from this network. Try again later." };
  if (
    status === 200 &&
    typeof b.deviceCode === "string" &&
    typeof b.userCode === "string" &&
    USER_CODE.test(b.userCode) &&
    typeof b.expiresIn === "number" &&
    typeof b.interval === "number"
  ) {
    return {
      deviceCode: b.deviceCode,
      userCode: b.userCode,
      expiresIn: b.expiresIn,
      interval: Math.max(1, b.interval),
    };
  }
  if (status === 200)
    return { error: "The server didn't answer like Session Coach. Check the site URL." };
  return { error: `Couldn't start the login (HTTP ${status}). Try again.` };
}

/** The page the learner approves on. Built here, not taken from the server, so only our own URL is ever opened. */
export function approveUrl(baseUrl: string, userCode: string): string {
  return `${baseUrl}/cli/approve?code=${encodeURIComponent(userCode)}`;
}

/** One poll's answer: keep waiting, wait longer, or a final result. */
export function interpretPoll(
  status: number,
  body: unknown,
): PollResult | { kind: "pending" } | { kind: "slow_down" } {
  const b = (body ?? {}) as { token?: unknown; email?: unknown; error?: unknown };
  if (status === 200 && typeof b.token === "string" && b.token.startsWith("sc_")) {
    return { kind: "success", token: b.token, email: typeof b.email === "string" ? b.email : null };
  }
  if (status === 429 || b.error === "slow_down") return { kind: "slow_down" };
  if (b.error === "authorization_pending") return { kind: "pending" };
  if (b.error === "expired_token") return { kind: "expired" };
  if (b.error === "access_denied") return { kind: "denied" };
  // A 5xx is worth another poll; the deadline still ends it.
  if (status >= 500) return { kind: "pending" };
  return { kind: "error", message: `Couldn't finish the login (HTTP ${status}). Try again.` };
}

export type PollOptions = {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  timeoutMs?: number;
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Polls until the learner decides or the code expires, waiting `interval` seconds between polls and 5 s longer after
 * each slow_down, up to the server's 60 s ceiling. A network error or 5xx is retried on the next tick.
 */
export async function pollForToken(
  baseUrl: string,
  start: DeviceStart,
  { fetchImpl = fetch, sleep = wait, now = Date.now, timeoutMs = 15_000 }: PollOptions = {},
): Promise<PollResult> {
  let interval = start.interval;
  const deadline = now() + start.expiresIn * 1000;
  while (now() < deadline) {
    await sleep(interval * 1000);
    const res = await send(deviceTokenRequest(baseUrl, start.deviceCode), {
      timeoutMs,
      retry: false,
      fetchImpl,
    });
    if ("error" in res) continue;
    const result = interpretPoll(res.status, res.body);
    if (result.kind === "pending") continue;
    if (result.kind === "slow_down") {
      interval = Math.min(interval + SLOW_DOWN_STEP_SECONDS, MAX_POLL_INTERVAL_SECONDS);
      continue;
    }
    return result;
  }
  return { kind: "expired" };
}

/**
 * The platform opener for a URL, or null unless it is http(s). Never a shell: on Windows `cmd /c start` would reparse
 * the URL (`|`, `^`, `%`), so it goes to url.dll's protocol handler, which takes it as one argument. The URL is
 * re-serialised by `new URL`, so it has no spaces or quotes.
 */
export function openerFor(url: string, os: string): [string, string[]] | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const href = parsed.href;
  if (os === "darwin") return ["open", [href]];
  if (os === "win32") return ["rundll32", ["url.dll,FileProtocolHandler", href]];
  return ["xdg-open", [href]];
}

/**
 * Opens a URL in the default browser with the platform's opener, no shell. Best effort: when it fails (no desktop, an
 * SSH session) the printed URL is the way in.
 */
export function openBrowser(url: string, os: string = platform()): void {
  const opener = openerFor(url, os);
  if (!opener) return;
  const [command, args] = opener;
  try {
    const child = spawn(command, args, { stdio: "ignore", detached: true });
    child.on("error", () => {});
    child.unref();
  } catch {
    // The URL is already printed.
  }
}
