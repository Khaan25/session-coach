import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SkeletonSuspense } from "skullet/react";

import { Container } from "@/components/app/container";
import { EmptyState } from "@/components/app/empty-state";
import { SessionFailedState } from "@/components/app/error-state";
import { ProcessingState } from "@/components/app/loading-state";
import { AppPageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { DecisionCard } from "@/components/cards/decision-card";
import { RefreshOnSettle } from "@/components/cards/refresh-on-settle";
import { Code } from "@/components/ui/code-block";
import { PageHeaderStat, PageHeaderStats } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { CardView } from "@/lib/cards/columns";
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
const sample = (position: number, decision: string, why: string, question: string): CardView => ({
  id: `sample-card-${position}`,
  position,
  decision,
  why,
  source: "stated",
  evidence: [
    {
      event_index: position + 1,
      quote: "Keyed on the token, so one learner on a shared IP doesn't block the others.",
      file: "apps/web/src/app/api/sessions/route.ts",
      lines: [12, 30],
      verified: true,
    },
  ],
  files: ["apps/web/src/app/api/sessions/route.ts"],
  question,
  flagged: false,
});
const SAMPLE_CARDS = [
  sample(
    0,
    "Rate limit the upload route per token, not per IP",
    "Learners behind one office IP would block each other; the token names the learner.",
    "Why is the limit keyed on the token rather than the IP?",
  ),
  sample(
    1,
    "Return 429 with a Retry-After header",
    "The CLI already backs off on Retry-After, so no client change was needed.",
    "Why does the route send Retry-After instead of only a 429?",
  ),
];

export default function SessionPage({ params }: PageProps<"/s/[id]">) {
  // Skullet measures the real page, drawn from a sample session, so the header and each card keep their shape when the
  // data lands. The card count isn't known until then, so the list can still grow or shrink.
  return (
    <SkeletonSuspense
      label="Loading the session"
      skeleton={<SessionView session={SAMPLE_SESSION} cards={SAMPLE_CARDS} now={SAMPLE_NOW} />}
    >
      <SessionDetail params={params} />
    </SkeletonSuspense>
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
  cards: CardView[];
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
        <>
          <ProcessingState status={status} />
          {userId && <RefreshOnSettle userId={userId} session={session} />}
        </>
      ) : status === "failed" ? (
        <SessionFailedState error={error} />
      ) : cards.length === 0 ? (
        // Extraction drops every card it can't back with an exact quote, so a ready session can end with none.
        <EmptyState
          title="No cards to show"
          description="This session has no cards available to review. Sessions where you talk through options give the most cards."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {cards.map((card) => (
            <DecisionCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </Container>
  );
}

/** Reads the clock outside render (cacheComponents and the compiler's purity rule), then the session. */
async function load(userId: string, id: string) {
  const now = new Date();
  return { now, found: await getSessionWithCards(userId, id) };
}
