import { MeasuredSkeleton } from "@/components/app/measured-suspense";

import { TodayColumn, TodaySampleView } from "./dashboard-sample-view";

// Shown while the route itself loads (a navigation before the page's shell arrives); the page's own Suspense draws the
// same skeleton while its data loads.
export default function TodayLoading() {
  return (
    <TodayColumn>
      <MeasuredSkeleton label="Loading today">
        <TodaySampleView />
      </MeasuredSkeleton>
    </TodayColumn>
  );
}
