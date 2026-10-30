import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EyeSlashIcon } from "@phosphor-icons/react/ssr";

import { Container } from "@/components/app/container";
import { EmptyState } from "@/components/app/empty-state";
import { SessionFailedState } from "@/components/app/error-state";
import { DecisionCardLoading, ProcessingState } from "@/components/app/loading-state";
import { AppPageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { DecisionCard } from "@/components/cards/decision-card";
import { RefreshOnSettle } from "@/components/cards/refresh-on-settle";
import { Code } from "@/components/ui/code-block";
import { PageHeaderStat, PageHeaderStats } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSessionWithCards } from "@/lib/cards/queries";
import { formatRelativeTime } from "@/lib/relative-time";

export const metadata: Metadata = { title: "Session" };

// cacheComponents needs at least one param to prerender the shell (the layout's breadcrumb reads the pathname). A
// learner's ids can't be known at build time, so this is a placeholder; every real id loads at request time.
export function generateStaticParams() {
  return [{ id: "00000000-0000-0000-0000-000000000000" }];
}

export default function SessionPage({ params }: PageProps<"/s/[id]">) {
  return (
    <Suspense
      fallback={
        <Container>
          <AppPageHeader title="Session" />
          <DecisionCardLoading />
        </Container>
      }
    >
      <SessionDetail params={params} />
    </Suspense>
  );
}

// Reads the signed-in learner, so it renders inside Suspense (cacheComponents). Missing, malformed or another
// learner's id: not found (the query filters on the learner's id, and RLS returns no row anyway).
async function SessionDetail({ params }: Pick<PageProps<"/s/[id]">, "params">) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  if (!user) notFound();
  const { now, found } = await load(user.id, id);
  if (!found) notFound();

  const { session, cards } = found;
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
          <RefreshOnSettle userId={user.id} session={session} />
        </>
      ) : status === "failed" ? (
        <SessionFailedState error={error} />
      ) : cards.length === 0 ? (
        <EmptyState
          icon={EyeSlashIcon}
          title="No cards to show"
          description="Every card from this session was hidden by the evidence check: none of its quotes matched the session."
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
