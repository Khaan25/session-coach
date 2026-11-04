import "server-only";

import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";

/**
 * How many of the learner's visible cards Defend it can pick from: answered 2 at least once, the same rule as
 * `POST /api/defend/start`. Learner reads through RLS; the inner embed drops a hidden card's answers.
 *
 * @param userId - The signed-in learner.
 * @returns The number of distinct cards.
 */
export async function defendableCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const answers = await fetchAll<{ card_id: string }>((from, to) =>
    supabase
      .from("answers")
      .select("card_id, card:decision_cards!inner(id)")
      .eq("user_id", userId)
      .eq("score", 2)
      .order("id")
      .range(from, to),
  );
  return new Set(answers.map(({ card_id }) => card_id)).size;
}
