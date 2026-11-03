import type { Metadata } from "next";
import Link from "next/link";

import { AllCaughtUpEmpty, DoneForTodayEmpty, NoCardsYetEmpty } from "@/components/app/empty-state";
import { Container } from "@/components/app/container";
import { MeasuredSuspense } from "@/components/app/measured-suspense";
import { AppPageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemLink,
  ItemTitle,
} from "@/components/ui/item";
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

const stepLabels = ["New", "Day 1", "Day 3", "Day 7"] as const;

export default function ReviewPage() {
  return (
    <Container>
      <AppPageHeader
        title="Review"
        description="Explain each decision back in your own words. Each card comes back on day 1, 3 and 7."
      />
      {/* Skullet measures the real queue, drawn from sample cards, so each row keeps its shape when the data lands. The
          queue length isn't known until then, so the list can still grow or shrink. */}
      <MeasuredSuspense
        label="Loading your review queue"
        skeleton={<QueueList queue={SAMPLE_QUEUE} />}
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
  if (queue.length > 0) return <QueueList queue={queue} />;
  // Only an empty queue pays for the second read: it tells a first run from a learner who is all caught up.
  const empty = await emptyQueue(user.id, now);
  if (!empty.hasCards) return <NoCardsYetEmpty cardless={await cardlessReason(user.id)} />;
  if (empty.doneToday) return <DoneForTodayEmpty cap={DAILY_CAP} />;
  return (
    <AllCaughtUpEmpty next={empty.nextDue ? dueInWords(empty.nextDue, empty.today) : undefined} />
  );
}

function QueueList({ queue }: { queue: QueueCard[] }) {
  const first = queue[0];
  return (
    <Card>
      <CardHeader>
        {/* skullet-own: static text stays real in the skeleton; only the queue is drawn as bars. */}
        <CardTitle skullet-own="">
          <h2>Due today</h2>
        </CardTitle>
        <CardDescription skullet-own="">
          Up to {DAILY_CAP} a day: cards due again, and new cards from the last 7 days.
        </CardDescription>
        {first && (
          <CardAction>
            <Link href={`/review/${first.id}`} className={buttonVariants()}>
              Start review
            </Link>
          </CardAction>
        )}
      </CardHeader>
      <ItemGroup>
        {queue.map((card) => (
          // ItemGroup is a div with role="list" (see ui/item.tsx), so the row takes the matching role.
          // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
          <Item key={card.id} role="listitem">
            <ItemContent>
              <ItemTitle>
                <ItemLink render={<Link href={`/review/${card.id}`} />}>{card.decision}</ItemLink>
              </ItemTitle>
              <ItemDescription>{card.sessionName}</ItemDescription>
            </ItemContent>
            <Badge>{stepLabels[card.step]}</Badge>
          </Item>
        ))}
      </ItemGroup>
    </Card>
  );
}

/** Reads the clock outside render (cacheComponents and the compiler's purity rule). */
async function load(userId: string) {
  const now = new Date();
  return { now, queue: await reviewQueue(userId, now) };
}
