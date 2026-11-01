import "server-only";

import { createClient } from "@/lib/supabase/server";

export type TrackerTask = {
  id: string;
  section: string;
  position: number;
  owner: "zia" | "kasam" | "both" | null;
  title: string;
  details: string | null;
  done_at: string | null;
};

/**
 * The build tracker's tasks in list order, through the RLS client.
 *
 * @returns The tasks, or null when the signed-in user isn't a tracker member (the page then 404s).
 */
export async function getTrackerTasks(): Promise<TrackerTask[] | null> {
  const supabase = await createClient();
  const { data: member, error: memberError } = await supabase.rpc("is_tracker_member");
  if (memberError) throw new Error(`is_tracker_member: ${memberError.message}`);
  if (!member) return null;

  const { data, error } = await supabase
    .from("tracker_tasks")
    .select("id, section, position, owner, title, details, done_at")
    .order("position")
    // A task added on the page shares its section's last position; the later one goes after.
    .order("created_at")
    .returns<TrackerTask[]>();
  if (error) throw new Error(`tracker_tasks: ${error.message}`);
  return data;
}
