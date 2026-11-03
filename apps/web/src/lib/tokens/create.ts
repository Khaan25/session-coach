import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken, newToken } from "@/lib/tokens/hash";
import { TOKEN_COLUMNS, type TokenRow } from "@/lib/tokens/queries";

/**
 * Creates a CLI token for a learner the caller has already checked. Only the sha256 is stored; the raw value comes
 * back this once and must never be logged.
 *
 * @param userId - The owner: the signed-in learner, or the learner who approved a device code.
 * @param label - What /setup shows for it (the device name), or null.
 * @returns The row as /setup lists it, plus the raw token.
 */
export async function createToken(
  userId: string,
  label: string | null,
): Promise<TokenRow & { token: string }> {
  const token = newToken();
  // Learners have no insert grant on cli_tokens, so this is the service role.
  const { data, error } = await createAdminClient()
    .from("cli_tokens")
    .insert({ user_id: userId, token_hash: hashToken(token), label })
    .select(TOKEN_COLUMNS)
    .single<TokenRow>();
  if (error) throw new Error(`createToken: ${error.message}`);
  return { ...data, token };
}
