// When callModel retries a failed call. Pure, so node --test runs it (call-model.ts imports `server-only`).

/** The provider answered with a non-2xx status. `retryAfter` is the raw `retry-after` header, if any. */
export class ProviderHttpError extends Error {
  name = "ProviderHttpError";
  status: number;
  retryAfter: string | null;

  constructor(provider: string, status: number, retryAfter: string | null) {
    super(`${provider} answered ${status}`);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

/**
 * Resolves after `ms`, or rejects with the signal's reason as soon as it aborts, so a cancelled run never sits in a wait.
 *
 * @param ms - How long to wait.
 * @param signal - Cancels the wait.
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** The wait before a retry when the provider gives no `retry-after`: a timeout, a 5xx, non-JSON output. */
export const RETRY_WAIT_MS = 2_000;

/** The longest `retry-after` honored, so two extraction calls still finish inside the pipeline's deadline. */
export const MAX_RETRY_WAIT_MS = 20_000;

/** The HTTP-date form `retry-after` uses (RFC 9110 IMF-fixdate), so an ISO date or other text isn't read as one. */
const SECONDS = /^\d+$/;
const HTTP_DATE = /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/;

/** A `retry-after` value (seconds or an HTTP date) in milliseconds from `now`, or null when it isn't readable. */
function parseRetryAfterMs(raw: string | null, now: number): number | null {
  const value = raw?.trim();
  if (!value) return null;
  if (SECONDS.test(value)) return Number(value) * 1_000;
  if (!HTTP_DATE.test(value)) return null;
  const ms = Date.parse(value) - now;
  return ms >= 0 ? ms : null; // NaN (an impossible date) fails this too
}

/**
 * How long to wait before retrying a failed model call.
 *
 * @param error - What the failed attempt threw.
 * @param now - The current time, for an HTTP-date `retry-after`; tests pass a fixed one.
 * @returns Milliseconds to wait, or null when a retry can't help: a 4xx other than 408 or 429 fails the same way again.
 *   A 429 waits for its `retry-after`, capped at `MAX_RETRY_WAIT_MS`.
 */
export function retryWaitMs(error: unknown, now = Date.now()): number | null {
  if (!(error instanceof ProviderHttpError)) return RETRY_WAIT_MS;
  if (error.status === 429) {
    const ms = parseRetryAfterMs(error.retryAfter, now);
    return ms === null ? RETRY_WAIT_MS : Math.min(ms, MAX_RETRY_WAIT_MS);
  }
  if (error.status === 408) return RETRY_WAIT_MS;
  if (error.status >= 400 && error.status < 500) return null;
  return RETRY_WAIT_MS;
}
