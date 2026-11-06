import { MeasuredSkeleton } from "@/components/app/measured-suspense";

import { SessionSampleView } from "./session-sample-view";

// Shown while the route itself loads (a navigation before the page's shell arrives); the page's own Suspense draws the
// same skeleton while the session loads.
export default function SessionLoading() {
  return (
    <MeasuredSkeleton label="Loading the session">
      <SessionSampleView />
    </MeasuredSkeleton>
  );
}
