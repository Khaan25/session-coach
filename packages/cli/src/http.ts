// Sending requests with a timeout and one retry, plus the token check `login` runs. No message here carries the token
// or a URL, since signed upload URLs hold a token too.

import type { HttpRequest, Outcome } from "./push.ts";

export type SendResult = { status: number; body: unknown } | { error: "timeout" | "network" };

export type SendOptions = {
  /** Abort the request after this long. */
  timeoutMs: number;
  /** Retry once after a network error, timeout or 5xx. Only for calls that are safe to repeat. */
  retry: boolean;
  /** Pause before the retry. */
  backoffMs?: number;
  fetchImpl?: typeof fetch;
};

async function attempt(req: HttpRequest, timeoutMs: number, fetchImpl: typeof fetch) {
  try {
    const res = await fetchImpl(req.url, { ...req.init, signal: AbortSignal.timeout(timeoutMs) });
    // An empty or non-JSON body is null; a timeout while reading it still fails the attempt.
    const body: unknown = await res.json().catch((err: unknown) => {
      if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError"))
        throw err;
      return null;
    });
    return { status: res.status, body };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return { error: timedOut ? ("timeout" as const) : ("network" as const) };
  }
}

/**
 * Sends a request. A network failure or timeout comes back as `{ error }`, never as a thrown error, so nothing
 * prints the URL.
 */
export async function send(req: HttpRequest, options: SendOptions): Promise<SendResult> {
  const { timeoutMs, retry, backoffMs = 1000, fetchImpl = fetch } = options;
  const first = await attempt(req, timeoutMs, fetchImpl);
  const failed = "error" in first || first.status >= 500;
  if (!retry || !failed) return first;
  await new Promise((resolve) => setTimeout(resolve, backoffMs));
  return attempt(req, timeoutMs, fetchImpl);
}

/** The message for a request that never got an answer. */
export function unreachable(error: "timeout" | "network", timeoutMs: number): string {
  if (error === "timeout")
    return `The server didn't answer within ${timeoutMs / 1000} s. Try again.`;
  return "Couldn't reach the server. Check your connection and the site URL (session-coach login --url <site url>), then try again.";
}

/** GET /api/cli/me: who the token belongs to. */
export function meRequest(baseUrl: string, token: string): HttpRequest {
  return {
    url: `${baseUrl}/api/cli/me`,
    init: { method: "GET", headers: { authorization: `Bearer ${token}` } },
  };
}

/**
 * The /api/cli/me response: exit code 0 means the token is good and may be saved.
 *
 * @param status - HTTP status.
 * @param body - Parsed JSON body, or null if it wasn't JSON.
 * @param url - The site URL, shown so the user sees where they signed in.
 */
export function interpretMe(status: number, body: unknown, url: string): Outcome {
  const email = (body as { email?: unknown } | null)?.email;
  // Only the documented `{ email: string | null }`: another app answering 200 at that URL isn't a sign-in.
  if (status === 200 && (typeof email === "string" || email === null)) {
    const who = email ? ` as ${email}` : "";
    return { message: `Signed in to ${url}${who}.`, exitCode: 0 };
  }
  if (status === 401) {
    return {
      message: `${url} doesn't accept that token. Create a new one on the app's /setup page. Nothing was saved.`,
      exitCode: 1,
    };
  }
  if (status === 200) {
    return {
      message: `${url} didn't answer like Session Coach. Check the site URL. Nothing was saved.`,
      exitCode: 1,
    };
  }
  return {
    message: `Couldn't check the token (HTTP ${status}). Nothing was saved; try again.`,
    exitCode: 1,
  };
}
