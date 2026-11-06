import type { Metadata } from "next";

import { AllCaughtUpEmpty, DoneForTodayEmpty, NoCardsYetEmpty } from "@/components/app/empty-state";
import { Container } from "@/components/app/container";
import { MeasuredSuspense } from "@/components/app/measured-suspense";
import { CardTransition } from "@/components/review/card-transition";
import { SAMPLE_REVIEW_QUEUE } from "@/components/review/review-sample";
import { QueueList, ReviewHeader } from "@/components/review/review-views";
import { getCurrentUser } from "@/lib/auth/current-user";
import { emptyQueue, reviewQueue } from "@/lib/review/queries";
import { dueInWords } from "@/lib/review/schedule";
import { DAILY_CAP } from "@/lib/review/today";
import { cardlessReason } from "@/lib/sessions/queries";

export const metadata: Metadata = { title: "Review" };

export default function ReviewPage() {
  return (
    <CardTransition>
      <Container>
        {/* The container width every app page shares, so moving along the queue keeps its place. */}
        <div className="flex flex-col gap-6">
          <ReviewHeader />
          {/* Skullet measures the real queue, drawn from sample cards, so each row keeps its shape when the data lands.
            The queue length isn't known until then, so the list can still grow or shrink. */}
          <MeasuredSuspense
            label="Loading your review queue"
            skeleton={<QueueList queue={SAMPLE_REVIEW_QUEUE} />}
          >
            <Queue />
          </MeasuredSuspense>
        </div>
      </Container>
    </CardTransition>
  );
}

async function Queue() {
  const user = await getCurrentUser();
  if (!user) return <NoCardsYetEmpty />;
  const { now, queue } = await load(user.id);
  if (queue.length > 0) return <QueueList queue={queue} />;
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
