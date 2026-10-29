import "server-only";

import { createClient } from "@/lib/supabase/server";

/** The token columns the setup page and the create route return, by name. Never token_hash. */
export const TOKEN_COLUMNS = "id, label, created_at, last_used_at";

/** One token as the setup page lists it. */
export type TokenRow = {
  id: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
};

/**
 * The learner's CLI tokens, newest first, through the RLS client.
 *
 * @param userId - The signed-in learner.
 */
export async function listTokens(userId: string): Promise<TokenRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cli_tokens")
    .select(TOKEN_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .overrideTypes<TokenRow[], { merge: false }>();
  if (error) throw new Error(`listTokens: ${error.message}`);
  return data;
}
