import { Container } from "@/components/app/container";
import { MeasuredSkeleton } from "@/components/app/measured-suspense";
import { SAMPLE_REVIEW_QUEUE } from "@/components/review/review-sample";
import { QueueList, ReviewHeader } from "@/components/review/review-views";

// Shown while the route itself loads; the same header and queue skeleton the page's own Suspense draws.
export default function ReviewLoading() {
  return (
    <Container>
      <div className="flex flex-col gap-6">
        <ReviewHeader />
        <MeasuredSkeleton label="Loading your review queue">
          <QueueList queue={SAMPLE_REVIEW_QUEUE} />
        </MeasuredSkeleton>
      </div>
    </Container>
  );
}
