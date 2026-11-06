import "server-only";

import { NextResponse } from "next/server";

import { bearerToken } from "@/lib/sessions/upload";
import { createClient } from "@/lib/supabase/server";
import { userForToken } from "@/lib/tokens/verify";

// Shared pieces of the route handlers in app/api. Each guard returns the value it checked or the response to return as
// is, the same shape as `requireDashboardKey` and `tooManyRequests`.

/** Postgres unique_violation. */
export const UNIQUE_VIOLATION = "23505";

/** For responses that carry a one-time secret or its state: never cached anywhere. */
export const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * The signed-in learner, from the auth server (`getUser`, not `getClaims`), so a deleted or banned user's live JWT is
 * refused. Use it before every write.
 *
 * @param headers - Extra headers for the 401, such as `NO_STORE`.
 * @returns The RLS client and the user, or a 401 to return.
 */
export async function requireUser(headers?: HeadersInit) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401, headers });
  return { supabase, user };
}

/**
 * The learner a CLI token (`Authorization: Bearer sc_…`) belongs to. Call it inside the route's try: a failed lookup
 * throws. Never log the token.
 *
 * @returns The learner's id, or a 401 to return.
 */
export async function requireCliUser(request: Request): Promise<string | NextResponse> {
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) return NextResponse.json({ error: "Missing CLI token" }, { status: 401 });
  const userId = await userForToken(token);
  if (!userId) {
    return NextResponse.json(
      { error: "Unknown CLI token. Run session-coach login again." },
      { status: 401 },
    );
  }
  return userId;
}

/**
 * Logs an unexpected failure and answers 500 with a sentence the learner can act on. Only the error's message is
 * logged, so a request body or token in its cause never reaches the logs.
 *
 * @param route - The log prefix, like `[api/sessions] create`.
 * @param error - What was thrown.
 * @param message - What the learner reads.
 * @param headers - Extra headers, such as `NO_STORE`.
 */
export function serverError(route: string, error: unknown, message: string, headers?: HeadersInit) {
  console.error(`${route} failed`, error instanceof Error ? error.message : error);
  return NextResponse.json({ error: message }, { status: 500, headers });
}
