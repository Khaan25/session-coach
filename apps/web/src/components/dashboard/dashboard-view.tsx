import { TerminalWindowIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { EmptyState } from "@/components/app/empty-state";
import { AppPageHeader } from "@/components/app/page-header";
import { ProjectTabs, type ProjectTab } from "@/components/app/project-tabs";
import { ReviewLadder } from "@/components/dashboard/review-ladder";
import { OwnershipMeter } from "@/components/progress/ownership-meter";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemLink,
  ItemTitle,
} from "@/components/ui/item";
import type { Ownership } from "@/lib/progress/ownership";
import type { EmptyQueue, QueueCard } from "@/lib/review/queries";
import { dueInWords, type Step } from "@/lib/review/schedule";
import { DAILY_CAP } from "@/lib/review/today";

// The dashboard, shared by /dashboard and /canvas so the two can't drift. Its one job: what should I do next? One
// column: today's cards first, then ownership, then sessions. Takes everything as props: the page reads the learner's
// rows, the canvas passes synthetic ones.

const ANSWER_FIRST =
  "You explain each card before you see its why; recalling it is what makes it stick.";

const OWNERSHIP =
  "Explained means you got it right once. Owned means you still could on day 11, without looking.";

export type DashboardViewProps = {
  /** No session sent yet: every block stays in place and says what will land in it. */
  firstVisit: boolean;
  /** Under the header: a new project's question-level cards. */
  before?: React.ReactNode;
  /** The project tabs, or null when the learner has no project. */
  tabs: ProjectTab[] | null;
  repo: string | null;
  queue: QueueCard[];
  /** The queue narrowed to the project filter. */
  due: QueueCard[];
  /** Why the queue is empty; null when it isn't, on a first visit, or when the read failed. */
  empty: EmptyQueue | null;
  /** Null when the read failed: the block is left out. */
  ownership: Ownership | null;
  /** shortcut: unused since the card rail was cut; /canvas still passes it. Drop it once the canvas stops. */
  anatomy?: { decision: string; question: string; step: Step } | null;
  /** The session rows (live on the page); on a first visit, the "Send your first session" block. */
  sessions: React.ReactNode;
  /** Newer and Older, when there are more pages. */
  pager?: React.ReactNode;
};

export function DashboardView({
  firstVisit,
  before,
  tabs,
  repo,
  queue,
  due,
  empty,
  ownership,
  sessions,
  pager,
}: DashboardViewProps) {
  const blocks = (
    <div className="flex min-w-0 flex-col gap-6">
      {firstVisit ? (
        // The first step leads, and the list stays live under it, so the first session shows up without a reload.
        <>
          {sessions}
          <DueCard
            title="Due today"
            description={`Cards to explain land here, at most ${DAILY_CAP} a day. ${ANSWER_FIRST}`}
          >
            <CardContent>
              <ReviewLadder />
            </CardContent>
          </DueCard>
          {ownership && <OwnershipBlock ownership={ownership} />}
        </>
      ) : (
        <>
          <DueBlock queue={queue} due={due} repo={repo} empty={empty} />
          {ownership && <OwnershipBlock ownership={ownership} />}
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Sessions</h2>
              </CardTitle>
              <CardDescription>
                Each one the CLI sends keeps up to 5 decisions backed by a quote from the log.
              </CardDescription>
            </CardHeader>
            {sessions}
            {pager && <CardFooter>{pager}</CardFooter>}
          </Card>
        </>
      )}
    </div>
  );
  return (
    <>
      <AppPageHeader
        title="Dashboard"
        description={
          firstVisit
            ? "Nothing here yet. Each block below says what will land in it."
            : "What to explain next, and how your agent’s decisions are sticking."
        }
      />
      {before}
      {tabs ? (
        <ProjectTabs tabs={tabs} repo={repo}>
          {blocks}
        </ProjectTabs>
      ) : (
        blocks
      )}
    </>
  );
}

/** A first visit's sessions block: the one step to take. */
export function FirstSessionEmpty() {
  return (
    <EmptyState
      icon={TerminalWindowIcon}
      title="Send your first session"
      description="Log in with the CLI, then send the session you just finished. It shows up here within a minute."
      action={
        <Link href="/setup" className={buttonVariants()}>
          Open setup
        </Link>
      }
    />
  );
}

/** Today's cards (the `todayQueue` rule, at most 5 a day), or why there are none. Never a card's why. */
function DueBlock({
  queue,
  due,
  repo,
  empty,
}: Pick<DashboardViewProps, "queue" | "due" | "repo" | "empty">) {
  if (queue.length > 0)
    return (
      <DueCard
        title={`${due.length} ${due.length === 1 ? "card is" : "cards are"} due today`}
        description={
          repo && due.length === 0
            ? `None of today's ${queue.length} are from ${repo}.`
            : ANSWER_FIRST
        }
        cards={due}
        start
      />
    );
  if (empty?.doneToday)
    return (
      <DueCard
        title="Done for today"
        description={`You've done ${DAILY_CAP} cards today. The rest come back tomorrow.`}
      />
    );
  if (empty?.hasCards)
    return (
      <DueCard
        title="All caught up"
        description={
          empty.nextDue
            ? `Nothing is due today. Your next card is due ${dueInWords(empty.nextDue, empty.today)}.`
            : "Nothing is due today, and no review is scheduled."
        }
      />
    );
  return (
    <DueCard
      title="Due today"
      description={`Cards to explain land here once a session is read, at most ${DAILY_CAP} a day.`}
    >
      <CardContent>
        <ReviewLadder />
      </CardContent>
    </DueCard>
  );
}

/** The page's hero: the large card size, today's count as its title and the one primary action. */
function DueCard({
  title,
  description,
  cards = [],
  start,
  children,
}: {
  title: string;
  description?: string;
  cards?: QueueCard[];
  /** Offers "Start review": there are cards left today. */
  start?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Card size="lg">
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {start && (
          <CardAction>
            <Link href="/review" className={buttonVariants()}>
              Start review
            </Link>
          </CardAction>
        )}
      </CardHeader>
      {cards.length > 0 && (
        <ItemGroup>
          {cards.map((card) => (
            // ItemGroup is a div with role="list" (see ui/item.tsx), so the row takes the matching role.
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
            <Item key={card.id} role="listitem">
              <ItemContent>
                <ItemTitle>
                  <ItemLink render={<Link href={`/review/${card.id}`} />}>{card.decision}</ItemLink>
                </ItemTitle>
                <ItemDescription>{card.question}</ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      )}
      {children}
    </Card>
  );
}

/** The ownership meter once the learner has a visible card; before that, the block says what will fill it. */
function OwnershipBlock({ ownership }: { ownership: Ownership }) {
  const { explained, owned, total } = ownership.overall;
  if (total > 0)
    return (
      <OwnershipMeter
        ownership={ownership}
        title={`Explained ${explained} · owned ${owned} of ${total}`}
        footer={<p className="type-body-sm text-text-2">{OWNERSHIP}</p>}
      />
    );
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Explained 0 · owned 0</h2>
        </CardTitle>
        <CardDescription>One bar per project, once you have cards. {OWNERSHIP}</CardDescription>
      </CardHeader>
    </Card>
  );
}
