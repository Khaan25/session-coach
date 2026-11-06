import type { Icon } from "@phosphor-icons/react";
import {
  CardsIcon,
  CaretRightIcon,
  LightbulbIcon,
  SealCheckIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { EmptyState } from "@/components/app/empty-state";
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
import { Stat, StatDescription, StatLabel } from "@/components/ui/stat";
import { Item, ItemContent, ItemDescription, ItemLink, ItemTitle } from "@/components/ui/item";
import type { Ownership } from "@/lib/progress/ownership";
import type { EmptyQueue, QueueCard } from "@/lib/review/queries";
import { dueInWords } from "@/lib/review/schedule";
import { DAILY_CAP } from "@/lib/review/today";

// The old dashboard, now drawn only by /canvas's picked-design preview: /dashboard is Today (today-view.tsx) since
// 2026-11-06 (DECISIONS). Its one job: what should I do next? A small
// header, three stats (due, explained, owned), then today's cards and the sessions side by side, and per-project bars
// only with 2+ projects. Takes everything as props: the page reads the learner's
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
  /** The session rows (live on the page); on a first visit, the "Send your first session" block. */
  sessions: React.ReactNode;
  /** Newer and Older, when there are more pages. */
  pager?: React.ReactNode;
  /** Beside the title: the setup guide's "Get started" on a first visit. */
  actions?: React.ReactNode;
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
  actions,
}: DashboardViewProps) {
  const blocks = (
    <div className="flex min-w-0 flex-col gap-4">
      <DashboardStats due={firstVisit ? 0 : due.length} ownership={ownership} />
      {firstVisit ? (
        // The first step leads, and the list stays live under it, so the first session shows up without a reload.
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <SessionsCard>{sessions}</SessionsCard>
          <DueCard
            title="Due today"
            description={`Cards to explain land here, at most ${DAILY_CAP} a day. ${ANSWER_FIRST}`}
          >
            <CardContent>
              <ReviewLadder />
            </CardContent>
          </DueCard>
        </div>
      ) : (
        <>
          {/* Two lists side by side from lg, stacked under it: today's cards first. */}
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <DueBlock queue={queue} due={due} repo={repo} empty={empty} />
            <SessionsCard pager={pager}>{sessions}</SessionsCard>
          </div>
          {/* The stats above carry the totals; the bars only add something with 2+ projects to compare. */}
          {ownership && ownership.overall.total > 0 && ownership.repos.length > 1 && (
            <OwnershipMeter
              ownership={ownership}
              title={`Explained ${ownership.overall.explained} · owned ${ownership.overall.owned} of ${ownership.overall.total}`}
              footer={<p className="type-body-sm text-text-2">{OWNERSHIP}</p>}
            />
          )}
        </>
      )}
    </div>
  );
  return (
    <>
      {/* A small, tight title: the page is a working view, and the blocks under it carry the weight. */}
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="flex flex-col gap-1">
          <h1 className="type-heading">Dashboard</h1>
          <p className="type-body text-text-2">
            {firstVisit
              ? "Nothing here yet. Each block below says what will land in it."
              : "What to explain next, and how your agent’s decisions are sticking."}
          </p>
        </div>
        {actions}
      </header>
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

/**
 * The Sessions card. On a first visit it holds the one step to take, and the live list replaces that step in place
 * when the first session arrives, so the rows are framed either way.
 */
function SessionsCard({ pager, children }: { pager?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Sessions</h2>
        </CardTitle>
        <CardDescription>
          Each one the CLI sends keeps up to 5 decisions backed by a quote from the log.
        </CardDescription>
      </CardHeader>
      {children}
      {pager && <CardFooter>{pager}</CardFooter>}
    </Card>
  );
}

/** A first visit's sessions block, inside the Sessions card: the one step to take. */
export function FirstSessionEmpty() {
  return (
    <EmptyState
      variant="plain"
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
        title="Review queue"
        count={due.length}
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

/**
 * The page's hero, first in the column: today's count as its title and the page's one primary action. The default card
 * size, so the header lines up with the rows' 16px inset.
 */
function DueCard({
  title,
  count,
  description,
  cards = [],
  start,
  children,
}: {
  title: string;
  /** Muted after the title: how many rows the list holds. */
  count?: number;
  description?: string;
  cards?: QueueCard[];
  /** Offers "Start review": there are cards left today. */
  start?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="flex items-baseline gap-2">
            <h2>{title}</h2>
            {count !== undefined && <span className="data text-text-3">{count}</span>}
          </span>
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
        // Rows straight in the card, split by its row rules: an ItemGroup would draw a second frame inside it. A div
        // with role="list", because Item renders a div.
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
        <div role="list" aria-label="Due today">
          {cards.map((card) => (
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
            <Item key={card.id} role="listitem">
              <ItemContent>
                <ItemTitle>
                  <ItemLink render={<Link href={`/review/${card.id}`} />}>{card.decision}</ItemLink>
                </ItemTitle>
                <ItemDescription>{card.question}</ItemDescription>
              </ItemContent>
              <CaretRightIcon aria-hidden className="shrink-0 text-text-3 rtl:-scale-x-100" />
            </Item>
          ))}
        </div>
      )}
      {children}
    </Card>
  );
}

/** The three numbers the page answers to, one framed card each: side by side from sm, stacked under it. */
function DashboardStats({ due, ownership }: { due: number; ownership: Ownership | null }) {
  const overall = ownership?.overall;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label="Due today" icon={CardsIcon} value={due}>
        At most {DAILY_CAP} a day
      </StatCard>
      {/* A failed ownership read leaves these two out rather than show a wrong 0. */}
      {overall && (
        <>
          <StatCard
            label="Explained"
            icon={LightbulbIcon}
            value={`${overall.explained} of ${overall.total}`}
          >
            Right once
          </StatCard>
          <StatCard
            label="Owned"
            icon={SealCheckIcon}
            value={`${overall.owned} of ${overall.total}`}
          >
            Still right on day 11, without looking
          </StatCard>
        </>
      )}
    </div>
  );
}

/** One stat in its own frame: the label with a quiet icon, the value, one faint line under it. */
function StatCard({
  label,
  icon: IconGlyph,
  value,
  children,
}: {
  label: string;
  icon: Icon;
  value: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Stat variant="framed">
      <div className="flex items-start justify-between gap-2">
        <StatLabel>{label}</StatLabel>
        <IconGlyph aria-hidden className="size-4 shrink-0 text-text-3" />
      </div>
      {/* The heading role, not StatValue's 32px: three numbers in a row read calmer at 22px. */}
      <p className="data type-heading">{value}</p>
      <StatDescription>{children}</StatDescription>
    </Stat>
  );
}
