import type { Metadata } from "next";

import { AllCaughtUpEmpty, DoneForTodayEmpty, NoCardsYetEmpty } from "@/components/app/empty-state";
import { Container } from "@/components/app/container";
import { MeasuredSuspense } from "@/components/app/measured-suspense";
import { AppPageHeader } from "@/components/app/page-header";
import { ReviewQueue } from "@/components/review/review-queue";
import { getCurrentUser } from "@/lib/auth/current-user";
import { emptyQueue, reviewQueue, type QueueCard } from "@/lib/review/queries";
import { dueInWords } from "@/lib/review/schedule";
import { DAILY_CAP } from "@/lib/review/today";
import { cardlessReason } from "@/lib/sessions/queries";

export const metadata: Metadata = { title: "Review" };

// Only the skeleton's shape comes from these: decision lengths and steps like a real queue.
const sample = (i: number, decision: string, sessionName: string, step: QueueCard["step"]) => ({
  id: `sample-${i}`,
  decision,
  sessionId: `sample-session-${i}`,
  sessionName,
  repo: null,
  step,
  dueOn: null,
  createdAt: "2026-01-01T12:00:00Z",
});
const SAMPLE_QUEUE: QueueCard[] = [
  sample(
    0,
    "Rate limit the upload route per token, not per IP",
    "Add rate limiting to the upload route",
    1,
  ),
  sample(
    1,
    "Render auth emails with React Email at build time",
    "Move auth emails to React Email",
    0,
  ),
  sample(
    2,
    "Save the tracker title on blur, not on every key",
    "Fix the tracker's inline title edit",
    2,
  ),
];

export default function ReviewPage() {
  return (
    <Container>
      <AppPageHeader
        title="Review"
        description="Explain each decision back in your own words. Pick a card to see where it is and what your answer will do to it."
      />
      {/* Skullet measures the real queue, drawn from sample cards, so each row keeps its shape when the data lands. The
          queue length isn't known until then, so the list can still grow or shrink. */}
      <MeasuredSuspense
        label="Loading your review queue"
        skeleton={<ReviewQueue queue={SAMPLE_QUEUE} cap={DAILY_CAP} />}
      >
        <Queue />
      </MeasuredSuspense>
    </Container>
  );
}

async function Queue() {
  const user = await getCurrentUser();
  if (!user) return <NoCardsYetEmpty />;
  const { now, queue } = await load(user.id);
  if (queue.length > 0) return <ReviewQueue queue={queue} cap={DAILY_CAP} />;
  // Only an empty queue pays for the second read: it tells a first run from a learner who is all caught up.
  const empty = await emptyQueue(user.id, now);
  if (!empty.hasCards) return <NoCardsYetEmpty cardless={await cardlessReason(user.id)} />;
  if (empty.doneToday) return <DoneForTodayEmpty cap={DAILY_CAP} />;
  return (
    <AllCaughtUpEmpty next={empty.nextDue ? dueInWords(empty.nextDue, empty.today) : undefined} />
  );
}

/** Reads the clock outside render (cacheComponents and the compiler's purity rule). */
async function load(userId: string) {
  const now = new Date();
  return { now, queue: await reviewQueue(userId, now) };
}
