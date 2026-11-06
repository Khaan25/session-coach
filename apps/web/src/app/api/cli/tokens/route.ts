/**
 * POST /api/cli/tokens: creates a CLI token for the signed-in learner. Body `{ label?: string }`.
 *   201 `{ token, id, label, created_at, last_used_at }`: `token` is the raw value, returned this once; only its
 *   sha256 is stored. 400 bad body, 401 signed out, 403 cross-site, 429 over 10 an hour (`Retry-After`), 500 anything
 *   else.
 * DELETE /api/cli/tokens?id=<uuid>: revokes one of the learner's tokens.
 *   200 `{ revoked: id }`, 400 bad id, 401 signed out, 404 not one of the learner's tokens, 500 anything else.
 * Never log the raw token.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { NO_STORE, requireUser, serverError } from "@/lib/api/http";
import { tooManyRequests, userRateLimit } from "@/lib/auth/rate-limit";
import { createToken } from "@/lib/tokens/create";
import { isSameOrigin } from "@/lib/tokens/device";

const createSchema = z.object({
  label: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((label) => label || null),
});

const idSchema = z.uuid();

/**
 * Creates a token. The raw value goes back once and is never stored or logged, so a database leak can't be replayed
 * against the upload API; a learner who loses it creates another.
 *
 * @param request - JSON body `{ label?: string }`.
 */
export async function POST(request: NextRequest) {
  // A cookie-authenticated POST that mints a credential: refuse other sites, as device approve does.
  if (!isSameOrigin(request.headers, request.nextUrl.origin)) {
    return NextResponse.json({ error: "Cross-site request refused" }, { status: 403 });
  }
  const signedIn = await requireUser();
  if (signedIn instanceof NextResponse) return signedIn;
  const { user } = signedIn;

  // Malformed JSON is a 400, not an unlabeled token.
  const body: unknown = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "label must be text of at most 100 characters", field: "label" },
      { status: 400 },
    );
  }

  const limited = await userRateLimit("tokenCreate", user.id);
  if (limited) return tooManyRequests(limited);

  try {
    // The user was checked above, and user_id is theirs.
    const created = await createToken(user.id, parsed.data.label);
    return NextResponse.json(created, { status: 201, headers: NO_STORE });
  } catch (err) {
    return serverError(
      "[api/cli/tokens] create",
      err,
      "Your token couldn't be created. Try again.",
    );
  }
}

/**
 * Revokes a token. Another learner's id answers 404, the same as a missing one, so ids can't be probed.
 *
 * @param request - Carries `?id=<uuid>`.
 */
export async function DELETE(request: NextRequest) {
  const signedIn = await requireUser();
  if (signedIn instanceof NextResponse) return signedIn;
  const { supabase, user } = signedIn;

  const id = idSchema.safeParse(request.nextUrl.searchParams.get("id"));
  if (!id.success) {
    return NextResponse.json({ error: "id must be a token id", field: "id" }, { status: 400 });
  }

  try {
    // The learner's own client: RLS allows deleting only their rows, and the user_id filter says so in code too.
    const { data, error } = await supabase
      .from("cli_tokens")
      .delete()
      .eq("id", id.data)
      .eq("user_id", user.id)
      .select("id");
    if (error) throw new Error(error.message);
    if (data.length === 0) return NextResponse.json({ error: "Token not found" }, { status: 404 });
    return NextResponse.json({ revoked: id.data });
  } catch (err) {
    return serverError(
      "[api/cli/tokens] revoke",
      err,
      "Your token couldn't be revoked. Try again.",
    );
  }
}
