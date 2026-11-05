import Link from "next/link";

import { AppPageHeader } from "@/components/app/page-header";
import { QuizForm } from "@/components/review/quiz-form";
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
import type { QueueCard, QuizCard } from "@/lib/review/queries";
import { DAILY_CAP } from "@/lib/review/today";

// /review and /review/[cardId] as they render, shared by the pages, their loading skeletons and /canvas.

const stepLabels = ["New", "Day 1", "Day 4", "Day 11"] as const;

/** /review's header. */
export function ReviewHeader() {
  return (
    <AppPageHeader
      title="Review"
      description="Explain each decision from memory, then see the reason. A card comes back on day 1, 4 and 11 until you own it."
    />
  );
}

/** Today's queue: each card's decision and session, never its why. */
export function QueueList({ queue }: { queue: QueueCard[] }) {
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

/** /review/[cardId]'s header: the decision and the session it came from. */
export function QuizHeader({ card }: { card: QuizCard }) {
  return (
    <AppPageHeader
      title={card.decision}
      description={
        <>
          From{" "}
          <Link href={`/s/${card.sessionId}`} className={buttonVariants({ variant: "link" })}>
            {card.sessionName}
          </Link>
        </>
      }
    />
  );
}

/** One card's quiz page. The canvas draws QuizHeader over QuizAnswer or QuizResult to show a step mid-way. */
export function QuizView({ card, nextHref }: { card: QuizCard; nextHref: string | null }) {
  return (
    <>
      <QuizHeader card={card} />
      <QuizForm key={card.id} cardId={card.id} question={card.question} nextHref={nextHref} />
    </>
  );
}
