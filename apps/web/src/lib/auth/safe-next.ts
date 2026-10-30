/** Where a signed-in learner goes when `next` is missing or unsafe. */
export const DEFAULT_NEXT = "/dashboard";

/**
 * Resolves a `next` redirect target against the request origin and keeps it only when it stays on that origin, so
 * `//evil.com`, `/\evil.com` and absolute URLs can't turn sign-in into an open redirect (docs/plans/auth.md #5).
 *
 * @param next - The raw `next` value from a query string or form field.
 * @param origin - The request's own origin, e.g. `https://app.example.com`.
 * @returns The path, query and hash to redirect to, or `/dashboard`.
 */
export function safeNext(next: string | null | undefined, origin: string): string {
  if (!next) return DEFAULT_NEXT;
  try {
    const base = new URL(origin);
    const url = new URL(next, base);
    // Dot segments can normalise to a "//host" path ("/.//evil.com"), which a later redirect reads as another origin.
    if (url.origin !== base.origin || url.pathname.startsWith("//")) return DEFAULT_NEXT;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_NEXT;
  }
}
