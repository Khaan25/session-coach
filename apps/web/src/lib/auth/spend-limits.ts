/**
 * The per-learner budgets that spend money on every call: a model run for each grade and each processed session.
 * Without Upstash in production these refuse instead of allowing, so a deploy missing the Redis env vars can't turn
 * spend protection off silently. A Redis error or timeout still allows the call, so a Redis outage doesn't stop
 * grading.
 */
export const SPEND_LIMITS: ReadonlySet<string> = new Set(["grade", "process"]);

/**
 * Whether a call with no limiter configured must be refused.
 *
 * @param action - The budget's name.
 * @param vercelEnv - `process.env.VERCEL_ENV`: only production refuses; local and preview stay open.
 */
export function refusesUnlimited(action: string, vercelEnv: string | undefined): boolean {
  return vercelEnv === "production" && SPEND_LIMITS.has(action);
}
