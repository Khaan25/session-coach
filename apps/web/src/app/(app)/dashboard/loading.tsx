import { Container } from "@/components/app/container";
import { MeasuredSkeleton } from "@/components/app/measured-suspense";

import { DashboardSampleView } from "./dashboard-sample-view";

// Shown while the route itself loads (a navigation before the page's shell arrives); the page's own Suspense draws the
// same skeleton while its data loads.
export default function DashboardLoading() {
  return (
    <Container>
      <MeasuredSkeleton label="Loading your dashboard">
        <DashboardSampleView />
      </MeasuredSkeleton>
    </Container>
  );
}
