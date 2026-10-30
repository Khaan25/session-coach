/**
 * The visitor's IP address for per-IP rate limits. Vercel sets `x-real-ip` and overwrites `x-forwarded-for` at its
 * edge, so a client can't spoof either there; elsewhere (local dev) they may be missing, and every request shares
 * "unknown".
 *
 * @param headers - The request headers.
 * @returns The address, or "unknown".
 */
export function clientIp(headers: Pick<Headers, "get">): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}
