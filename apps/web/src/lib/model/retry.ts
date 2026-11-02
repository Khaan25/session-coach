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

/** The wait before a retry when the provider gives no `retry-after`: a timeout, a 5xx, non-JSON output. */
export const RETRY_WAIT_MS = 2_000;

/**
 * The longest wait a `retry-after` can ask for. Two 30 s attempts plus this, twice over with extraction's 60 s retry
 * delay, keeps a run near 220 s, under the process route's 300 s `maxDuration`.
 */
export const MAX_RETRY_WAIT_MS = 20_000;

/** The HTTP-date form `retry-after` uses (RFC 9110 IMF-fixdate), so an ISO date or other text isn't read as one. */
const HTTP_DATE = /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/;

/**
 * How long to wait before retrying a failed model call.
 *
 * @param error - What the failed attempt threw.
 * @param now - The current time, for an HTTP-date `retry-after`; tests pass a fixed one.
 * @returns Milliseconds to wait, or null when a retry can't help: a 4xx other than 429 (bad key, bad request) will
 *   fail the same way again; 408 (a timeout) is retried. A 429 waits for its `retry-after` seconds, capped at `MAX_RETRY_WAIT_MS`.
 */
export function retryWaitMs(error: unknown, now = Date.now()): number | null {
  if (!(error instanceof ProviderHttpError)) return RETRY_WAIT_MS;
  if (error.status === 429) {
    // Seconds or an HTTP date; a missing, blank or unreadable header falls back to the default wait.
    // Number("") is 0, not NaN, so blank is checked first.
    const raw = error.retryAfter?.trim();
    const seconds = !raw
      ? Number.NaN
      : /^\d+$/.test(raw)
        ? Number(raw)
        : HTTP_DATE.test(raw)
          ? (Date.parse(raw) - now) / 1_000
          : Number.NaN;
    if (!Number.isFinite(seconds) || seconds < 0) return RETRY_WAIT_MS;
    return Math.min(seconds * 1_000, MAX_RETRY_WAIT_MS);
  }
  // 408 is the provider timing out (OpenRouter sends it): transient, like a 5xx.
  if (error.status === 408) return RETRY_WAIT_MS;
  if (error.status >= 400 && error.status < 500) return null;
  return RETRY_WAIT_MS;
}
