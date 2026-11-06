import { Container } from "@/components/app/container";
import { MeasuredSkeleton } from "@/components/app/measured-suspense";
import { TaskList } from "@/features/tracker/task-list";

// Shown while the route itself loads, measured like the page's own Suspense fallback. No header: the page draws it
// only for members. Only the skeleton's shape comes from these tasks.
export default function TrackerLoading() {
  return (
    <Container>
      <MeasuredSkeleton label="Loading the tracker">
        <TaskList
          context=""
          tasks={["Web app", "Web app", "Web app", "CLI", "CLI"].map((section, i) => ({
            id: `sample-${i}`,
            section,
            position: i,
            owner: i < 3 ? "zia" : "kasam",
            title: "A task on the list",
            details: "Notes on the task.",
            done_at: i % 3 === 0 ? "2026-11-01T00:00:00.000Z" : null,
          }))}
        />
      </MeasuredSkeleton>
    </Container>
  );
}
