import { CaretRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { AppPageHeader } from "@/components/app/page-header";
import { QuizForm } from "@/components/review/quiz-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
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
      description={`Up to ${DAILY_CAP} a day: cards due again, and new cards from the last 7 days.`}
    />
  );
}

/** Today's queue: each card's decision and session, never its why. A header row with the count and Start, then one list. */
export function QueueList({ queue }: { queue: QueueCard[] }) {
  const first = queue[0];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-(--row) items-center justify-between gap-3">
        {/* skullet-own: static text stays real in the skeleton; only the queue is drawn as bars. */}
        <h2 skullet-own="" className="flex items-baseline gap-2 type-heading-xs">
          Due today
          <span className="data type-body-sm text-text-3">{queue.length}</span>
        </h2>
        {first && (
          <Link
            href={`/review/${first.id}`}
            transitionTypes={["forward"]}
            className={buttonVariants()}
          >
            Start review
          </Link>
        )}
      </div>
      <ItemGroup>
        {queue.map((card) => (
          // ItemGroup is a div with role="list" (see ui/item.tsx), so the row takes the matching role.
          // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
          <Item key={card.id} role="listitem">
            <ItemContent>
              {/* The session rides inline after the decision; ItemTitle drops it on a narrow row. */}
              <ItemTitle>
                <ItemLink
                  render={<Link href={`/review/${card.id}`} transitionTypes={["forward"]} />}
                >
                  {card.decision}
                </ItemLink>
                <span className="type-body-sm text-text-2">{card.sessionName}</span>
              </ItemTitle>
            </ItemContent>
            <ItemActions>
              <Badge>{stepLabels[card.step]}</Badge>
              <CaretRightIcon aria-hidden="true" className="text-text-3 rtl:-scale-x-100" />
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </div>
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
