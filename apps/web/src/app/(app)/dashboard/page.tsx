import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Container } from "@/components/app/container";
import { MeasuredSuspense } from "@/components/app/measured-suspense";
import { NoSessionsEmpty } from "@/components/app/empty-state";
import { AppPageHeader } from "@/components/app/page-header";
import { SessionRow } from "@/components/app/session-row";
import {
  ANSWER_FIRST,
  CardAnatomy,
  ReviewLadder,
  STEP_LABELS,
} from "@/components/dashboard/card-anatomy";
import { WhatsThis } from "@/components/dashboard/whats-this";
import { OwnershipMeter } from "@/components/progress/ownership-meter";
import { ProjectSetup } from "@/components/projects/project-setup";
import { SessionList } from "@/components/sessions/session-list";
import { Badge } from "@/components/ui/badge";
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
import { getCurrentUser } from "@/lib/auth/current-user";
import type { Ownership } from "@/lib/progress/ownership";
import { getOwnership } from "@/lib/progress/queries";
import { listProjects } from "@/lib/projects/queries";
import {
  emptyQueue,
  getQuizCard,
  reviewQueue,
  type EmptyQueue,
  type QueueCard,
} from "@/lib/review/queries";
import { dueInWords } from "@/lib/review/schedule";
import { DAILY_CAP } from "@/lib/review/today";
import { listSessions } from "@/lib/sessions/queries";
import { PAGE_SIZE, parsePage, parseRepo, type SessionListItem } from "@/lib/sessions/rows";

export const metadata: Metadata = { title: "Dashboard" };

// Only the skeleton's shape comes from these: text lengths and statuses like a real list.
const SAMPLE_NOW = new Date("2026-01-01T12:00:00Z");
const sample = (
  i: number,
  title: string,
  status: SessionListItem["status"],
  cardCount?: number,
): Parameters<typeof SessionRow>[0]["session"] & { cardCount?: number } => ({
  id: `sample-${i}`,
  title,
  repo: "session-coach",
  branch: null,
  status,
  error: null,
  created_at: new Date(SAMPLE_NOW.getTime() - (i + 1) * 3_600_000).toISOString(),
  cardCount,
});
const SAMPLE_SESSIONS = [
  sample(0, "Add rate limiting to the upload route", "ready", 4),
  sample(1, "Move auth emails to React Email", "ready", 3),
  sample(2, "Fix the tracker's inline title edit", "processing"),
  sample(3, "Stream the CLI upload", "ready", 5),
];
const sampleCard = (i: number, decision: string, sessionName: string, step: QueueCard["step"]) => ({
  id: `sample-card-${i}`,
  decision,
  sessionId: `sample-${i}`,
  sessionName,
  repo: "session-coach",
  step,
  dueOn: null,
  createdAt: SAMPLE_NOW.toISOString(),
});
const SAMPLE_QUEUE: QueueCard[] = [
  sampleCard(
    0,
    "Rate limit the upload route per token, not per IP",
    "Add rate limiting to the upload route",
    1,
  ),
  sampleCard(1, "Render auth emails with React Email at build time", "Move auth emails", 0),
];

/**
 * The rail's card when the learner has none due: synthetic, marked as a sample, and only a decision and a question,
 * never the shared fixture or an answer key.
 */
const SAMPLE_ANATOMY = {
  decision: "Rate limit the upload route per token, not per IP",
  question: "Why is the limit keyed on the token rather than the IP?",
  step: 1,
} as const;

const OWNERSHIP =
  "Explained means you answered it right once. Owned means you still could on day 11, without looking.";

// shortcut: the page and repo are read from searchParams directly; nuqs isn't installed (no new dependencies this phase).
export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <Container>
      <AppPageHeader
        title="Dashboard"
        description="Your agent’s decisions, project by project. Open any “What’s this?” to learn the part next to it."
      />
      <ProjectSetup />
      {/* Skullet measures the real blocks, drawn from sample data, so each keeps its shape when the data lands. The
          row counts, the filter and the page links aren't known until then, so the blocks can still grow or shrink. */}
      <MeasuredSuspense
        label="Loading your dashboard"
        skeleton={
          <DashboardGrid rail={<CardAnatomy card={SAMPLE_ANATOMY} sample />}>
            <DueCard title="Due today" cards={SAMPLE_QUEUE} start />
            <Card>
              {/* skullet-own: the heading is static, so it stays real, not a bar. */}
              <CardHeader skullet-own="">
                <CardTitle>
                  <h2>Sessions</h2>
                </CardTitle>
              </CardHeader>
              <ItemGroup>
                {SAMPLE_SESSIONS.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    cardCount={session.cardCount}
                    now={SAMPLE_NOW}
                  />
                ))}
              </ItemGroup>
            </Card>
          </DashboardGrid>
        }
      >
        <Dashboard searchParams={searchParams} />
      </MeasuredSuspense>
    </Container>
  );
}

/** Option B's layout: the blocks in a two-thirds main column, one card taken apart in the rail beside them. */
function DashboardGrid({ rail, children }: { rail: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">{children}</div>
      {rail}
    </div>
  );
}

/** The dashboard's URL for a page of sessions, keeping the repo filter. */
function dashboardHref(repo: string | null, page = 1) {
  const params = new URLSearchParams();
  if (repo) params.set("repo", repo);
  if (page > 1) params.set("page", String(page));
  return params.size > 0 ? `/dashboard?${params}` : "/dashboard";
}

async function Dashboard({ searchParams }: Pick<PageProps<"/dashboard">, "searchParams">) {
  const user = await getCurrentUser();
  if (!user) return <NoSessionsEmpty />;
  const params = await searchParams;
  const page = parsePage(params.page);
  const repo = parseRepo(params.repo);
  const { now, sessions, hasMore, queue, repos, ownership } = await load(user.id, page, repo);
  // A repo the learner has no session in: show every session rather than an empty list.
  if (repo && repos && !repos.includes(repo)) redirect("/dashboard");
  // Past the last page: go to the first rather than show "no sessions yet".
  if (page > 1 && sessions.length === 0) redirect(dashboardHref(repo));
  // No session sent yet: every block stays in place and says what will land in it.
  const firstVisit = !repo && page === 1 && sessions.length === 0;
  const due = repo ? queue.filter((card) => card.repo === repo) : queue;
  const { anatomy, empty } = await loadExtras(user.id, now, due[0] ?? queue[0], firstVisit);

  const dueCard = <DueBlock queue={queue} due={due} repo={repo} empty={empty} />;
  const ownershipCard = ownership && <OwnershipBlock ownership={ownership} />;
  const sessionsCard = (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Sessions</h2>
        </CardTitle>
      </CardHeader>
      <SessionList
        key={`${repo}:${page}`}
        sessions={sessions}
        userId={user.id}
        now={now.toISOString()}
        prepend={page === 1}
        repo={repo ?? undefined}
        limit={PAGE_SIZE}
      />
      {(page > 1 || hasMore) && (
        <CardFooter>
          <nav aria-label="Session pages" className="flex w-full justify-between gap-2">
            {page > 1 ? (
              <Link
                href={dashboardHref(repo, page - 1)}
                className={buttonVariants({ variant: "secondary" })}
              >
                Newer
              </Link>
            ) : (
              <span />
            )}
            {hasMore && (
              <Link
                href={dashboardHref(repo, page + 1)}
                className={buttonVariants({ variant: "secondary" })}
              >
                Older
              </Link>
            )}
          </nav>
        </CardFooter>
      )}
      <CardFooter>
        <WhatsThis label="Where do sessions come from?">
          The CLI sends a finished Claude Code session. The server keeps up to 5 decisions it can
          back with a quote from the log, and drops the rest.
        </WhatsThis>
      </CardFooter>
    </Card>
  );

  return (
    <>
      {repos && repos.length > 0 && (
        <nav aria-label="Projects" className="flex flex-wrap gap-2">
          {[null, ...repos].map((name) => (
            <Link
              key={name ?? ""}
              href={dashboardHref(name)}
              aria-current={name === repo ? "page" : undefined}
              className={buttonVariants({
                variant: name === repo ? "secondary" : "ghost",
                size: "sm",
              })}
            >
              {name ?? "All projects"}
            </Link>
          ))}
        </nav>
      )}
      <DashboardGrid
        rail={
          anatomy ? <CardAnatomy card={anatomy} /> : <CardAnatomy card={SAMPLE_ANATOMY} sample />
        }
      >
        {/* First visit: the sessions block leads, since its empty state is the first step (/setup), and it stays live,
            so the first session shows up without a reload. */}
        {firstVisit ? (
          <>
            {sessionsCard}
            {dueCard}
            {ownershipCard}
          </>
        ) : (
          <>
            {dueCard}
            {ownershipCard}
            {sessionsCard}
          </>
        )}
      </DashboardGrid>
    </>
  );
}

/** Today's cards (the `todayQueue` rule, at most 5 a day), or why there are none. Never a card's why. */
function DueBlock({
  queue,
  due,
  repo,
  empty,
}: {
  queue: QueueCard[];
  /** The queue narrowed to the project filter. */
  due: QueueCard[];
  repo: string | null;
  /** Why the queue is empty; null when it isn't, on a first visit, or when the read failed. */
  empty: EmptyQueue | null;
}) {
  if (queue.length > 0)
    return (
      <DueCard
        title={`${queue.length} ${queue.length === 1 ? "card is" : "cards are"} due today`}
        description={
          repo
            ? due.length === 0
              ? `None of them are from ${repo}.`
              : `${due.length} from ${repo}.`
            : undefined
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
    <Card>
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
                <ItemDescription>{card.sessionName}</ItemDescription>
              </ItemContent>
              <Badge variant="outline">{STEP_LABELS[card.step]}</Badge>
            </Item>
          ))}
        </ItemGroup>
      )}
      {children}
      <CardFooter>
        <WhatsThis label="Why can’t I see the answers?">{ANSWER_FIRST}</WhatsThis>
      </CardFooter>
    </Card>
  );
}

/** The ownership meter once the learner has a visible card; before that, the block says what will fill it. */
function OwnershipBlock({ ownership }: { ownership: Ownership }) {
  const footer = (
    <WhatsThis label="Explained or owned?">
      {OWNERSHIP} Owned stays at 0 until your first card passes its day 11 review.
    </WhatsThis>
  );
  if (ownership.overall.total > 0) return <OwnershipMeter ownership={ownership} footer={footer} />;
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

/** Reads the clock outside render (cacheComponents and the compiler's purity rule), then the queries. */
async function load(userId: string, page: number, repo: string | null) {
  const now = new Date();
  const [{ sessions, hasMore }, queue, projects, ownership] = await Promise.all([
    listSessions({ userId, page, repo }),
    reviewQueue(userId, now),
    // Only the filter links need it, so a failed read hides them instead of failing the session list.
    listProjects(userId).catch((error: unknown) => {
      console.error("[dashboard] listProjects", error);
      return null;
    }),
    // A summary above the list: a failed read hides the meter rather than taking the dashboard down. /progress shows
    // the error.
    getOwnership().catch((error: unknown) => {
      console.error("[dashboard] getOwnership", error);
      return null;
    }),
  ]);
  return {
    now,
    sessions,
    hasMore,
    queue,
    repos: projects?.map((project) => project.repo) ?? null,
    ownership,
  };
}

/**
 * The second round of reads, each only when it's needed and each optional (a failure falls back, never throws):
 * the rail's card through `getQuizCard`, which selects the question but never the why, the evidence or the answer key;
 * and, for an empty queue, why it's empty.
 */
async function loadExtras(
  userId: string,
  now: Date,
  next: QueueCard | undefined,
  firstVisit: boolean,
) {
  const [quiz, empty] = await Promise.all([
    next
      ? getQuizCard(userId, next.id).catch((error: unknown) => {
          console.error("[dashboard] getQuizCard", error);
          return null;
        })
      : null,
    next || firstVisit
      ? null
      : emptyQueue(userId, now).catch((error: unknown) => {
          console.error("[dashboard] emptyQueue", error);
          return null;
        }),
  ]);
  return {
    anatomy:
      quiz && next ? { decision: quiz.decision, question: quiz.question, step: next.step } : null,
    empty,
  };
}
