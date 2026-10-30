/**
 * POST /api/cli/tokens: creates a CLI token for the signed-in learner. Body `{ label?: string }`.
 *   201 `{ token, id, label, created_at, last_used_at }`: `token` is the raw value, returned this once; only its
 *   sha256 is stored. 400 bad body, 401 signed out, 500 anything else.
 * DELETE /api/cli/tokens?id=<uuid>: revokes one of the learner's tokens.
 *   200 `{ revoked: id }`, 400 bad id, 401 signed out, 404 not one of the learner's tokens, 500 anything else.
 * Never log the raw token.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashToken, newToken } from "@/lib/tokens/hash";
import { TOKEN_COLUMNS, type TokenRow } from "@/lib/tokens/queries";

const createSchema = z.object({
  label: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((label) => label || null),
});

const idSchema = z.uuid();

/** The learner from the auth server (getUser, not getClaims): a revoked session's live JWT is refused. */
async function signedInUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Creates a token. The raw value goes back once and is never stored or logged, so a database leak can't be replayed
 * against the upload API; a learner who loses it creates another.
 *
 * @param request - JSON body `{ label?: string }`.
 */
export async function POST(request: NextRequest) {
  const { user } = await signedInUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body: unknown = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "label must be text of at most 100 characters", field: "label" },
      { status: 400 },
    );
  }

  try {
    const token = newToken();
    // Learners have no insert grant on cli_tokens; the user was checked above, and user_id is theirs.
    const { data, error } = await createAdminClient()
      .from("cli_tokens")
      .insert({ user_id: user.id, token_hash: hashToken(token), label: parsed.data.label })
      .select(TOKEN_COLUMNS)
      .single<TokenRow>();
    if (error) throw new Error(error.message);
    return NextResponse.json({ ...data, token }, { status: 201 });
  } catch (err) {
    console.error("[api/cli/tokens] create failed", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Your token couldn't be created. Try again." },
      { status: 500 },
    );
  }
}

/**
 * Revokes a token. Another learner's id answers 404, the same as a missing one, so ids can't be probed.
 *
 * @param request - Carries `?id=<uuid>`.
 */
export async function DELETE(request: NextRequest) {
  const { supabase, user } = await signedInUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

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
    console.error("[api/cli/tokens] revoke failed", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Your token couldn't be revoked. Try again." },
      { status: 500 },
    );
  }
}
