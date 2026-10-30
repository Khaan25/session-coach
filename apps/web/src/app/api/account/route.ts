/**
 * DELETE /api/account: deletes the signed-in learner's account for good.
 * Order: Storage objects first (no row points at them afterwards), then the auth user (cascades through profiles to
 * every learner row), then the session cookies. A failure before the user is deleted leaves the account usable, so
 * the learner can retry.
 */
import { NextResponse } from "next/server";

import { accountStoragePaths, SESSIONS_BUCKET } from "@/lib/settings/account-storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";

/** Storage list and remove both take at most this many objects per call. */
const BATCH = 1000;

export async function DELETE() {
  const supabase = await createClient();
  // getUser(), not getClaims(): asks the auth server, so a deleted or banned user's live JWT is refused.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const admin = createAdminClient();
    const storage = admin.storage.from(SESSIONS_BUCKET);

    const sessions = await fetchAll<{ raw_path: string }>((from, to) =>
      admin.from("sessions").select("raw_path").eq("user_id", user.id).order("id").range(from, to),
    );
    const listed: { name: string; id: string | null }[] = [];
    for (;;) {
      const { data, error } = await storage.list(user.id, { limit: BATCH, offset: listed.length });
      if (error) throw error;
      listed.push(...data);
      if (data.length < BATCH) break;
    }

    const paths = accountStoragePaths(
      user.id,
      sessions.map((session) => session.raw_path),
      listed,
    );
    for (let i = 0; i < paths.length; i += BATCH) {
      const { error } = await storage.remove(paths.slice(i, i + BATCH));
      if (error) throw error;
    }

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
  } catch (err) {
    console.error("[api/account] delete failed", err);
    return NextResponse.json(
      { error: "Your account couldn't be deleted. Try again." },
      { status: 500 },
    );
  }

  // The user is gone, so the server call 404s; auth-js clears the session cookies anyway.
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.json({ deleted: true });
}
