import { MeasuredSkeleton } from "@/components/app/measured-suspense";
import { SAMPLE_PROGRESS } from "@/components/progress/progress-sample";
import { ProgressSummary } from "@/components/progress/progress-view";

// Shown while the route itself loads; the same skeleton the page's own Suspense draws.
export default function ProgressLoading() {
  return (
    <MeasuredSkeleton label="Loading your progress">
      <ProgressSummary data={SAMPLE_PROGRESS} />
    </MeasuredSkeleton>
  );
}
