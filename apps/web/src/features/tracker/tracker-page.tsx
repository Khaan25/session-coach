import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/app/container";
import { MeasuredSuspense } from "@/components/app/measured-suspense";
import { AppPageHeader } from "@/components/app/page-header";
import { TaskList } from "@/features/tracker/task-list";
import { PROJECT_CONTEXT } from "@/features/tracker/context";
import { getTrackerTasks, type TrackerTask } from "@/features/tracker/queries";

export const metadata: Metadata = { title: "Tracker", robots: { index: false } };

// Only the skeleton's shape comes from these: two sections, owners and notes like the real list.
const sample = (
  i: number,
  section: string,
  title: string,
  owner: TrackerTask["owner"],
  done: boolean,
): TrackerTask => ({
  id: `sample-${i}`,
  section,
  position: i,
  owner,
  title,
  details: "Notes on the task.",
  done_at: done ? "2026-11-01T00:00:00.000Z" : null,
});
const SAMPLE_TASKS: TrackerTask[] = [
  sample(0, "Web app", "Skeletons for every data page", "zia", true),
  sample(1, "Web app", "Email reminders on due days", "zia", false),
  sample(2, "Web app", "Delete a session from its page", "both", false),
  sample(3, "CLI", "Publish the CLI to npm", "kasam", true),
  sample(4, "CLI", "Retry uploads from the outbox", "kasam", false),
];

export default function TrackerPage() {
  return (
    <Container>
      {/* cacheComponents: the read uses cookies, so it streams inside Suspense. The header is inside too, so a
          non-member never sees it. */}
      <MeasuredSuspense
        label="Loading the tracker"
        skeleton={<TaskList tasks={SAMPLE_TASKS} context="" />}
      >
        <Tasks />
      </MeasuredSuspense>
    </Container>
  );
}

async function Tasks() {
  const tasks = await getTrackerTasks();
  // Learners aren't tracker members: the page doesn't exist for them. cacheComponents keeps the cookie read inside
  // Suspense, so this renders the not-found page after the shell has streamed (status 200); RLS returns them no rows.
  // shortcut: a real 404 status needs the membership check in Proxy (lib/supabase/proxy.ts), before streaming starts.
  if (!tasks) notFound();
  return (
    <>
      <AppPageHeader title="Tracker" description="What's left to ship, and who's on it." />
      <TaskList tasks={tasks} context={PROJECT_CONTEXT} />
    </>
  );
}
