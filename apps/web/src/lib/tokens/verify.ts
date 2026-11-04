import "server-only";

import { after } from "next/server";

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
    .maybeSingle();
  if (error) throw new Error(`userForToken: ${error.message}`);
  if (!data) return null;

  // Best effort, after the response: a failed stamp must not refuse or slow a valid upload.
  const usedAt = new Date().toISOString();
  after(async () => {
    const { error: stampError } = await admin
      .from("cli_tokens")
      .update({ last_used_at: usedAt })
      .eq("id", data.id);
    if (stampError) console.error("[tokens/verify] last_used_at not stamped", stampError.message);
  });
  return data.user_id;
}
