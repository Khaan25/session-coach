import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens/hash";

/**
 * The learner a CLI token belongs to. The token is hashed and looked up, never stored or logged, and `last_used_at`
 * is stamped so the setup page shows which tokens are live.
 *
 * @param token - The raw `sc_…` token from the Authorization header.
 * @returns The owner's user id, or null when no token matches (unknown or revoked).
 */
export async function userForToken(token: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cli_tokens")
    .select("id, user_id")
    .eq("token_hash", hashToken(token))
    .maybeSingle<{ id: string; user_id: string }>();
  if (error) throw new Error(`userForToken: ${error.message}`);
  if (!data) return null;

  // Best effort: a failed stamp must not refuse a valid upload.
  const { error: stampError } = await admin
    .from("cli_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);
  if (stampError) console.error("[tokens/verify] last_used_at not stamped", stampError.message);
  return data.user_id;
}
