import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LockSimpleIcon } from "@phosphor-icons/react/ssr";

import { Container } from "@/components/app/container";
import { MeasuredSuspense } from "@/components/app/measured-suspense";
import { EmptyState } from "@/components/app/empty-state";
import { SessionFailedState } from "@/components/app/error-state";
import { ProcessingState } from "@/components/app/processing-state";
import { AppPageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { DecisionCard, LockedDecisionCard } from "@/components/cards/decision-card";
import { RefreshOnSettle } from "@/components/cards/refresh-on-settle";
import {
  CardOutline,
  Mark,
  Marked,
  ReviewPath,
  SessionGuideLayout,
} from "@/components/sessions/session-guide";
import { buttonVariants } from "@/components/ui/button";
import { Code, CodeBlock } from "@/components/ui/code-block";
import { PageHeaderStat, PageHeaderStats } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { SessionCard } from "@/lib/cards/columns";
import { getSessionWithCards } from "@/lib/cards/queries";
import type { SessionSummary } from "@/lib/sessions/rows";
import { formatRelativeTime } from "@/lib/relative-time";

export const metadata: Metadata = { title: "Session" };

// cacheComponents needs at least one param to prerender the shell (the layout's breadcrumb reads the pathname). A
// learner's ids can't be known at build time, so this is a placeholder; every real id loads at request time.
export function generateStaticParams() {
  return [{ id: "00000000-0000-0000-0000-000000000000" }];
}

// Only the skeleton's shape comes from these: a ready session with cards of typical length.
const SAMPLE_NOW = new Date("2026-01-01T12:00:00Z");
const SAMPLE_SESSION: SessionSummary = {
  id: "sample-session",
  title: "Add rate limiting to the upload route",
  repo: "session-coach",
  branch: "zia/rate-limit",
  started_at: new Date(SAMPLE_NOW.getTime() - 3 * 3_600_000).toISOString(),
  duration_min: 42,
  status: "ready",
  error: null,
  created_at: SAMPLE_NOW.toISOString(),
};
// Locked, as most cards are on a learner's first visit to a session: no why or evidence until they answer.
const sample = (position: number, decision: string, question: string): SessionCard => ({
  locked: true,
  id: `sample-card-${position}`,
  position,
  decision,
  question,
});
const SAMPLE_CARDS = [
  sample(
    0,
    "Rate limit the upload route per token, not per IP",
    "Why is the limit keyed on the token rather than the IP?",
  ),
  sample(
    1,
    "Return 429 with a Retry-After header",
    "Why does the route send Retry-After instead of only a 429?",
  ),
];

export default function SessionPage({ params }: PageProps<"/s/[id]">) {
  // Skullet measures the real page, drawn from a sample session, so the header and each card keep their shape when the
  // data lands. The card count isn't known until then, so the list can still grow or shrink.
  return (
    <MeasuredSuspense
      label="Loading the session"
      skeleton={<SessionView session={SAMPLE_SESSION} cards={SAMPLE_CARDS} now={SAMPLE_NOW} />}
    >
      <SessionDetail params={params} />
    </MeasuredSuspense>
  );
}

// Reads the signed-in learner, so it renders inside Suspense (cacheComponents). Missing, malformed or another
// learner's id: not found (the query filters on the learner's id, and RLS returns no row anyway).
async function SessionDetail({ params }: Pick<PageProps<"/s/[id]">, "params">) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  if (!user) notFound();
  const { now, found } = await load(user.id, id);
  if (!found) notFound();
  return <SessionView {...found} now={now} userId={user.id} />;
}

function SessionView({
  session,
  cards,
  now,
  userId,
}: {
  session: SessionSummary;
  cards: SessionCard[];
  now: Date;
  /** Only a pending or processing session needs it, to refresh when it settles. */
  userId?: string;
}) {
  const { title, repo, branch, started_at, duration_min, status, error } = session;
  const started = started_at ? formatRelativeTime(started_at, now) : null;

  return (
    <Container>
      <AppPageHeader
        title={title || [repo, branch].filter(Boolean).join(" on ") || "Untitled session"}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {repo && <Code>{repo}</Code>}
            {branch && <Code>{branch}</Code>}
            <StatusBadge status={status} />
          </span>
        }
      >
        <PageHeaderStats>
          <PageHeaderStat
            label="Duration"
            value={duration_min ?? "None"}
            detail={duration_min === null ? undefined : "min"}
          />
          <PageHeaderStat label="Started" value={started ?? "None"} />
          {status === "ready" && <PageHeaderStat label="Cards" value={cards.length} />}
        </PageHeaderStats>
      </AppPageHeader>

      {status === "pending" || status === "processing" ? (
        <SessionGuideLayout state="processing">
          <Marked mark={<Mark n={1} />}>
            <ProcessingState status={status} />
          </Marked>
          <CardOutline />
          {userId && <RefreshOnSettle userId={userId} session={session} />}
        </SessionGuideLayout>
      ) : status === "failed" ? (
        <SessionGuideLayout state="failed">
          <Marked mark={<Mark n={1} />}>
            <SessionFailedState error={error} />
          </Marked>
          <Marked mark={<Mark n={2} />}>
            <CodeBlock variant="command" command="npx session-coach push --latest" />
          </Marked>
        </SessionGuideLayout>
      ) : cards.length === 0 ? (
        <SessionGuideLayout state="no-cards">
          <Marked mark={<Mark n={1} />}>
            {/* Extraction drops every card it can't back with an exact quote, so a ready session can end with none. */}
            <EmptyState
              title="No decisions found"
              description="This session gave no cards. Your other sessions may have some waiting."
              action={
                <Link href="/dashboard" className={buttonVariants({ variant: "secondary" })}>
                  See your sessions
                </Link>
              }
            />
          </Marked>
          <div className="flex items-start gap-3 well p-3">
            <Mark n={2} />
            <p className="type-body-sm text-text-2">
              Next session, ask your agent to compare two approaches and say why it picks one.
            </p>
          </div>
        </SessionGuideLayout>
      ) : (
        <SessionGuideLayout state="ready">
          <ReadyCards cards={cards} />
        </SessionGuideLayout>
      )}
    </Container>
  );
}

/**
 * The cards with the guide's marks, each on the first card that has that part: 1 the decision, 2 where an answer is
 * scored (the first answer box, else the first Explain it), 3 the why and its quotes (only on an answered card), 4 the
 * review path, 5 the lock on an unanswered card.
 */
function ReadyCards({ cards }: { cards: SessionCard[] }) {
  const firstLocked = cards.find((card) => card.locked)?.id;
  const firstOpen = cards.find((card) => !card.locked)?.id;
  return (
    <>
      {cards.map((card, i) => {
        const decision = i === 0 ? <Mark n={1} /> : undefined;
        if (card.locked)
          return (
            <LockedDecisionCard
              key={card.id}
              card={card}
              marks={{ decision, answer: card.id === firstLocked ? <Mark n={2} /> : undefined }}
            >
              {card.id === firstLocked && (
                <p className="flex items-center gap-3 type-body-sm text-text-3">
                  <Mark n={5} />
                  <LockSimpleIcon aria-hidden />
                  Why, source and quote open after you answer.
                </p>
              )}
            </LockedDecisionCard>
          );
        const first = card.id === firstOpen;
        return (
          <DecisionCard
            key={card.id}
            card={card}
            marks={{
              decision,
              why: first ? <Mark n={3} /> : undefined,
              question: first && !firstLocked ? <Mark n={2} /> : undefined,
            }}
          />
        );
      })}
      <div className="flex items-center gap-3 well p-3">
        <Mark n={4} />
        <ReviewPath />
      </div>
    </>
  );
}

/** Reads the clock outside render (cacheComponents and the compiler's purity rule), then the session. */
async function load(userId: string, id: string) {
  const now = new Date();
  return { now, found: await getSessionWithCards(userId, id) };
}
