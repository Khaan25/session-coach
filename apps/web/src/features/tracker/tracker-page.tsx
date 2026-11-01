import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Container } from "@/components/app/container";
import { AppPageHeader } from "@/components/app/page-header";
import { TaskList } from "@/features/tracker/task-list";
import { Skeleton } from "@/components/ui/skeleton";
import { PROJECT_CONTEXT } from "@/features/tracker/context";
import { getTrackerTasks } from "@/features/tracker/queries";

export const metadata: Metadata = { title: "Tracker", robots: { index: false } };

export default function TrackerPage() {
  return (
    <Container>
      <AppPageHeader title="Tracker" description="What's left to ship, and who's on it." />
      {/* cacheComponents: the read uses cookies, so it streams inside Suspense. */}
      <Suspense fallback={<TrackerLoading />}>
        <Tasks />
      </Suspense>
    </Container>
  );
}

async function Tasks() {
  const tasks = await getTrackerTasks();
  // Learners aren't tracker members: the page doesn't exist for them. cacheComponents keeps the cookie read inside
  // Suspense, so this renders the not-found page after the shell has streamed (status 200); RLS returns them no rows.
  if (!tasks) notFound();
  return <TaskList tasks={tasks} context={PROJECT_CONTEXT} />;
}

function TrackerLoading() {
  return (
    <div className="flex flex-col gap-4">
      <output className="sr-only">Loading the tracker</output>
      <Skeleton className="h-6" />
      <Skeleton className="h-64" />
      <Skeleton className="h-40" />
    </div>
  );
}
