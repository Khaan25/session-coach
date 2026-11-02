import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { clientIp } from "./client-ip";

/** The auth actions with their own per-IP budget. Reset and resend share one: both send email to any address. */
export type AuthLimit = "signIn" | "signUp" | "email";

// Per IP. Supabase's own limits (per address and per project) still apply behind these.
const WINDOWS = {
  signIn: Ratelimit.slidingWindow(10, "10 m"),
  signUp: Ratelimit.slidingWindow(5, "1 h"),
  email: Ratelimit.slidingWindow(5, "1 h"),
} as const;

// Redis.fromEnv reads UPSTASH_REDIS_REST_URL/TOKEN, or the KV_REST_API_URL/TOKEN names the Vercel Marketplace sets.
const configured = Boolean(
  (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
  (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN),
);

/** The per-learner actions that cost model calls or storage, each with its own budget. */
export type UserLimit = "push" | "process" | "grade";

// Per learner id, so a leaked CLI token or a looping script can't run up model and storage bills. A learner pushes a
// few sessions a day; 20 an hour still covers a backfill burst. Each process is one extraction run, so it gets the same
// budget. A day's review queue is a few dozen cards; 60 grades an hour is one a minute, sustained.
const USER_WINDOWS = {
  push: Ratelimit.slidingWindow(20, "1 h"),
  process: Ratelimit.slidingWindow(20, "1 h"),
  grade: Ratelimit.slidingWindow(60, "1 h"),
} as const;

/** What a 429 says, by action. */
const USER_LIMIT_ERROR: Record<UserLimit, string> = {
  push: "Too many uploads in the last hour.",
  process: "Too many sessions processed in the last hour.",
  grade: "Too many answers in the last hour.",
};

/**
 * One limiter per budget, or null without Upstash configured.
 *
 * @param windows - The budgets by name.
 * @param scope - The Redis key prefix's middle part, so auth and user budgets never share keys.
 */
function limitersFor<K extends string>(
  windows: Record<K, ReturnType<typeof Ratelimit.slidingWindow>>,
  scope: string,
) {
  if (!configured) return null;
  return Object.fromEntries(
    Object.entries<ReturnType<typeof Ratelimit.slidingWindow>>(windows).map(([name, limiter]) => [
      name,
      // timeout: if Redis doesn't answer in 1 s, the attempt is allowed rather than locking everyone out.
      new Ratelimit({
        redis: Redis.fromEnv(),
        limiter,
        prefix: `sc:${scope}:${name}`,
        timeout: 1000,
      }),
    ]),
  ) as Record<K, Ratelimit>;
}

const limiters = limitersFor<AuthLimit>(WINDOWS, "auth");
const userLimiters = limitersFor<UserLimit>(USER_WINDOWS, "user");

let warned = false;

/** Logs once per instance, in production only, that limits are off because Upstash isn't configured. */
function warnUnconfigured() {
  if (process.env.VERCEL_ENV === "production" && !warned) {
    warned = true;
    console.error("auth/rate-limit: Upstash Redis is not configured; rate limits are off");
  }
}

/**
 * Counts one attempt at an auth action from this visitor's IP, so one machine can't guess passwords or flood
 * sign-up and reset emails across many addresses.
 *
 * Fails open: without Upstash configured (local dev) or when Redis errors, the attempt is allowed and Supabase's
 * limits are the only guard.
 *
 * @param action - Which budget to spend.
 * @returns 0 when the attempt may go ahead, otherwise the whole minutes until this IP may try again.
 */
export async function authAttemptWait(action: AuthLimit): Promise<number> {
  if (!limiters) {
    warnUnconfigured();
    return 0;
  }
  try {
    const { success, reset } = await limiters[action].limit(clientIp(await headers()));
    return success ? 0 : Math.max(1, Math.ceil((reset - Date.now()) / 60_000));
  } catch (error) {
    console.error(`auth/rate-limit ${action}`, error);
    return 0;
  }
}

/**
 * Counts one `action` by this learner and, once their hourly budget is spent, answers for the route.
 *
 * Fails open like `authAttemptWait`: without Upstash or when Redis errors or times out, the call goes ahead.
 *
 * @example
 * const limited = await userRateLimit("process", userId);
 * if (limited) return limited;
 *
 * @param action - Which budget to spend.
 * @param userId - The authenticated learner's id (never an unchecked value from the request).
 * @returns null when the call may go ahead, otherwise a 429 `{ error }` with `Retry-After` in seconds.
 */
export async function userRateLimit(
  action: UserLimit,
  userId: string,
): Promise<NextResponse | null> {
  if (!userLimiters) {
    warnUnconfigured();
    return null;
  }
  try {
    const { success, reset } = await userLimiters[action].limit(userId);
    if (success) return null;
    const seconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    const minutes = Math.ceil(seconds / 60);
    return NextResponse.json(
      {
        error: `${USER_LIMIT_ERROR[action]} Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`,
      },
      { status: 429, headers: { "Retry-After": String(seconds) } },
    );
  } catch (error) {
    console.error(`auth/rate-limit ${action}`, error);
    return null;
  }
}
