import { Container } from "@/components/app/container";
import { NextCard, TodayView } from "@/components/dashboard/today-view";
import { SAMPLE_QUEUE } from "@/components/dashboard/dashboard-sample";

/**
 * Today's frame: the app container narrowed to the reading measure, the one page that is (DECISIONS, 2026-11-06), so
 * the single thing to do sits in a calm column.
 */
export function TodayColumn({ children }: { children: React.ReactNode }) {
  return <Container className="max-w-(--measure) gap-8 sm:py-16">{children}</Container>;
}

/** Today drawn from a sample card: what the page's loading skeleton measures, in loading.tsx and the page. */
export function TodaySampleView() {
  return (
    <TodayView
      greeting="Evening"
      lede="Explain it from memory first. The why comes after."
      habit="You own 4 of 12 decisions · 9 explained"
      hero={<NextCard card={SAMPLE_QUEUE[0]} left={SAMPLE_QUEUE.length} />}
    />
  );
}
