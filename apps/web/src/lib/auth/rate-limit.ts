import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { clientIp } from "./client-ip";
import { refusesUnlimited } from "./spend-limits";

/**
 * The signed-out actions with their own per-IP budget. Reset and resend share one: both send email to any address.
 * deviceStart and devicePoll are the CLI's device-code login, which runs before the CLI has a token. report is the
 * public ownership report (/r/[slug] and GET /api/report/[slug]), read by strangers with no session.
 */
export type AuthLimit = "signIn" | "signUp" | "email" | "deviceStart" | "devicePoll" | "report";

// Per IP. Supabase's own limits (per address and per project) still apply behind these.
const WINDOWS = {
  signIn: Ratelimit.slidingWindow(10, "10 m"),
  signUp: Ratelimit.slidingWindow(5, "1 h"),
  email: Ratelimit.slidingWindow(5, "1 h"),
  // A login is one start; 10 in 10 minutes covers retries and a few laptops behind one NAT.
  deviceStart: Ratelimit.slidingWindow(10, "10 m"),
  // One code polled every 5 s for its 10 minutes is 120; 300 leaves room for a few logins at once from one address.
  devicePoll: Ratelimit.slidingWindow(300, "10 m"),
  // A reviewer opens a report a few times; 60 in 10 minutes stops a script walking slugs or hammering one page.
  report: Ratelimit.slidingWindow(60, "10 m"),
} as const;

// Redis.fromEnv reads UPSTASH_REDIS_REST_URL/TOKEN, or the KV_REST_API_URL/TOKEN names the Vercel Marketplace sets.
const configured = Boolean(
  (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
  (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN),
);

/** The per-learner actions that cost model calls or storage, each with its own budget. */
export type UserLimit = "push" | "process" | "grade" | "deviceDecide" | "tokenCreate";

// Per learner id, so a leaked CLI token or a looping script can't run up model and storage bills. A learner pushes a
// few sessions a day; 20 an hour still covers a backfill burst. Each process is one extraction run, so it gets the same
// budget. A day's review queue is a few dozen cards; 60 grades an hour is one a minute, sustained.
const USER_WINDOWS = {
  push: Ratelimit.slidingWindow(20, "1 h"),
  process: Ratelimit.slidingWindow(20, "1 h"),
  grade: Ratelimit.slidingWindow(60, "1 h"),
  // Approving or denying a CLI login, and looking a code up on /cli/approve: a person does a handful, so 30 an hour
  // stops a signed-in script from guessing other people's user codes (20^8 of them).
  deviceDecide: Ratelimit.slidingWindow(30, "1 h"),
  // Creating a CLI token by hand on /setup: a person makes one or two, so 10 an hour stops a script minting them.
  tokenCreate: Ratelimit.slidingWindow(10, "1 h"),
} as const;

/** What a 429 says, by action. */
const USER_LIMIT_ERROR: Record<UserLimit, string> = {
  push: "Too many uploads in the last hour.",
  process: "Too many sessions processed in the last hour.",
  grade: "Too many answers in the last hour.",
  deviceDecide: "Too many CLI login requests in the last hour.",
  tokenCreate: "Too many tokens created in the last hour.",
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
    console.error(
      "auth/rate-limit: Upstash Redis is not configured; rate limits are off and grade and process are refused",
    );
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
 * A refused call: what to tell the learner, and when they may try again. `status` is 503 when the call is refused
 * because limits aren't configured, otherwise the budget is spent (429).
 */
export type UserLimited = { message: string; retryAfterSeconds: number; status?: 503 };

/**
 * Counts one `action` by this learner. Fails open like `authAttemptWait` when Redis errors or times out. Without
 * Upstash configured it also fails open, except for the model-spend budgets in production (`refusesUnlimited`),
 * which answer 503.
 *
 * @param action - Which budget to spend.
 * @param userId - The authenticated learner's id (never an unchecked value from the request).
 * @returns null when the call may go ahead.
 */
export async function userRateLimit(
  action: UserLimit,
  userId: string,
): Promise<UserLimited | null> {
  if (!userLimiters) {
    warnUnconfigured();
    if (!refusesUnlimited(action, process.env.VERCEL_ENV)) return null;
    return {
      message: "This is switched off until rate limits are set up on our side. Try again later.",
      retryAfterSeconds: 3600,
      status: 503,
    };
  }
  try {
    const { success, reset } = await userLimiters[action].limit(userId);
    if (success) return null;
    const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    const minutes = Math.ceil(retryAfterSeconds / 60);
    const message = `${USER_LIMIT_ERROR[action]} Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`;
    return { message, retryAfterSeconds };
  } catch (error) {
    console.error(`auth/rate-limit ${action}`, error);
    return null;
  }
}

/** The route's 429 for a spent budget (503 when limits aren't configured): `{ error }` with `Retry-After` in seconds. */
export function tooManyRequests({ message, retryAfterSeconds, status }: UserLimited): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: status ?? 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
