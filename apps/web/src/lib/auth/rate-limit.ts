import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

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

const limiters = configured
  ? (Object.fromEntries(
      Object.entries(WINDOWS).map(([name, limiter]) => [
        name,
        // timeout: if Redis doesn't answer in 1 s, the attempt is allowed rather than locking everyone out.
        new Ratelimit({
          redis: Redis.fromEnv(),
          limiter,
          prefix: `sc:auth:${name}`,
          timeout: 1000,
        }),
      ]),
    ) as Record<AuthLimit, Ratelimit>)
  : null;

let warned = false;

/**
 * Counts one attempt at an auth action from this visitor's IP, so one machine can't guess passwords or flood
 * sign-up and reset emails across many addresses.
 *
 * Fails open: without Upstash configured (local dev) or when Redis errors, the attempt is allowed and Supabase's
 * limits are the only guard.
 *
 * @param action - Which budget to spend.
 * @returns True when the attempt may go ahead.
 */
export async function allowAuthAttempt(action: AuthLimit): Promise<boolean> {
  if (!limiters) {
    if (process.env.VERCEL_ENV === "production" && !warned) {
      warned = true;
      console.error("auth/rate-limit: Upstash Redis is not configured; per-IP limits are off");
    }
    return true;
  }
  try {
    const { success } = await limiters[action].limit(clientIp(await headers()));
    return success;
  } catch (error) {
    console.error(`auth/rate-limit ${action}`, error);
    return true;
  }
}
