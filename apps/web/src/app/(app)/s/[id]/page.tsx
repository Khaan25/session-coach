import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EyeSlashIcon } from "@phosphor-icons/react/ssr";

import { Container } from "@/components/app/container";
import { EmptyState } from "@/components/app/empty-state";
import { SessionFailedState } from "@/components/app/error-state";
import { ProcessingState } from "@/components/app/loading-state";
import { AppPageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { DecisionCard } from "@/components/cards/decision-card";
import { Code } from "@/components/ui/code-block";
import { PageHeaderStat, PageHeaderStats } from "@/components/ui/page-header";
import { getSessionCards } from "@/lib/sample/cards";
import { getSampleSession, SAMPLE_NOW, sampleSessionIds } from "@/lib/sample/sessions";
import { formatRelativeTime } from "@/lib/relative-time";

export const metadata: Metadata = { title: "Session" };

// Blocks on params so an unknown id still answers 404 before streaming. TODO(zia): revisit with the real query:
// a Suspense boundary around the data (with the loading skeleton) makes the navigation instant.
export const instant = false;

// cacheComponents needs at least one param to prerender; the sample sessions cover every status.
// TODO(zia): the learner's session ids can't be known at build time; return one placeholder and load at request time.
export function generateStaticParams() {
  return sampleSessionIds.map((id) => ({ id }));
}

export default async function SessionPage({ params }: PageProps<"/s/[id]">) {
  const { id } = await params;
  // TODO(zia): load the session and its cards with the learner's client (RLS returns no row for another learner).
  const session = getSampleSession(id);
  if (!session) notFound();

  const { title, repo, branch, started_at, duration_min, status, error } = session;
  const cards = status === "ready" ? getSessionCards(id) : [];
  const started = started_at ? formatRelativeTime(started_at, SAMPLE_NOW) : null;

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
        // TODO(zia): subscribe to this session's status with Realtime, as the dashboard does (Phase 5 step 4).
        <ProcessingState status={status} />
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
