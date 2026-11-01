import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Container } from "@/components/app/container";
import { AppPageHeader } from "@/components/app/page-header";
import { TaskList } from "@/components/tracker/task-list";
import { Skeleton } from "@/components/ui/skeleton";
import { getTrackerTasks } from "@/lib/tracker/queries";

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
  // Learners aren't tracker members: the page doesn't exist for them.
  if (!tasks) notFound();
  return <TaskList tasks={tasks} />;
}

function TrackerLoading() {
  return (
    <div className="flex flex-col gap-4">
      <output className="sr-only">Loading the tracker</output>
      <Skeleton aria-hidden className="h-6" />
      <Skeleton aria-hidden className="h-64" />
      <Skeleton aria-hidden className="h-40" />
    </div>
  );
}
