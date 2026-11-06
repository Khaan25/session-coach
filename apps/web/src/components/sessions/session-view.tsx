import { Container } from "@/components/app/container";
import { EmptyState } from "@/components/app/empty-state";
import { SessionFailedState } from "@/components/app/error-state";
import { ProcessingState } from "@/components/app/processing-state";
import { AppPageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { DecisionCard, LockedDecisionCard } from "@/components/cards/decision-card";
import { RefreshOnSettle } from "@/components/cards/refresh-on-settle";
import { RetrySessionButton } from "@/components/sessions/retry-session-button";
import { Code } from "@/components/ui/code-block";
import { PageHeaderStat, PageHeaderStats } from "@/components/ui/page-header";
import type { SessionCard } from "@/lib/cards/columns";
import type { SessionSummary } from "@/lib/sessions/rows";
import { formatRelativeTime } from "@/lib/relative-time";

/**
 * /s/[id]: one session's header, then its cards or why there are none. Shared by the page, its loading skeleton and
 * /canvas, so the three can't drift. Takes only the learner-readable columns.
 */
export function SessionView({
  session,
  cards,
  now,
  userId,
  stuck = false,
}: {
  session: SessionSummary;
  cards: SessionCard[];
  now: Date;
  /** Only a pending or processing session needs it, to refresh when it settles. */
  userId?: string;
  /** A run that was killed or an upload that died (`isStuck`): shown as failed, with Try again. */
  stuck?: boolean;
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
          {/* The start time rides in the duration's detail, not a stat of its own. */}
          <PageHeaderStat
            label="Duration"
            value={duration_min ?? "None"}
            detail={
              [duration_min === null ? null : "min", started && `started ${started}`]
                .filter(Boolean)
                .join(" · ") || undefined
            }
          />
          {status === "ready" && <PageHeaderStat label="Cards" value={cards.length} />}
        </PageHeaderStats>
      </AppPageHeader>

      {stuck ? (
        <SessionFailedState
          error="This session stopped before its cards were made."
          action={<RetrySessionButton sessionId={session.id} />}
        />
      ) : status === "pending" || status === "processing" ? (
        <>
          <ProcessingState status={status} />
          {userId && <RefreshOnSettle userId={userId} session={session} />}
        </>
      ) : status === "failed" ? (
        <SessionFailedState error={error} action={<RetrySessionButton sessionId={session.id} />} />
      ) : cards.length === 0 ? (
        // Extraction drops every card it can't back with an exact quote, so a ready session can end with none.
        <EmptyState
          title="No decisions to learn from this session."
          description={
            <>
              <span className="block">
                It was mostly edits and commands, with no real choice between options. We may also
                have missed one.
              </span>
              <span className="mt-2 block">
                Next time, ask your agent to explain why it picked an approach, and say your reasons
                in your prompts. Sessions that state the reasons give better cards.
              </span>
            </>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          <p className="type-body text-text-2">
            Each card is one decision your agent made. Explain why in your own words; the reason and
            its quote open after you answer.
          </p>
          {cards.map((card) =>
            card.locked ? (
              <LockedDecisionCard key={card.id} card={card} />
            ) : (
              <DecisionCard key={card.id} card={card} />
            ),
          )}
        </div>
      )}
    </Container>
  );
}
