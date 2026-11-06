import { Container } from "@/components/app/container";
import { MeasuredSkeleton } from "@/components/app/measured-suspense";
import { SAMPLE_QUIZ_CARD } from "@/components/review/review-sample";
import { QuizView } from "@/components/review/review-views";

// The route blocks (instant = false), so this shows on every navigation to a card: the same skeleton the page's own
// Suspense draws.
export default function CardLoading() {
  return (
    <Container>
      <div className="flex flex-col gap-6">
        <MeasuredSkeleton label="Loading the card">
          <QuizView card={SAMPLE_QUIZ_CARD} nextHref={null} />
        </MeasuredSkeleton>
      </div>
    </Container>
  );
}
