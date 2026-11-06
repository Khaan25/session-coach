import { Container } from "@/components/app/container";
import { EmptyState } from "@/components/app/empty-state";
import { SessionFailedState } from "@/components/app/error-state";
import { ProcessingState } from "@/components/app/processing-state";
import { StatusBadge } from "@/components/app/status-badge";
import { DecisionCard, LockedDecisionCard } from "@/components/cards/decision-card";
import { RefreshOnSettle } from "@/components/cards/refresh-on-settle";
import { RetrySessionButton } from "@/components/sessions/retry-session-button";
import { Code } from "@/components/ui/code-block";
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
  const meta = [
    duration_min !== null && `${duration_min} min`,
    started && `started ${started}`,
    status === "ready" &&
      cards.length > 0 &&
      `${cards.length} ${cards.length === 1 ? "card" : "cards"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Container>
      {/* A small title over one line of facts, instead of a stat strip: a missing duration no longer fills a large
          "None" cell, and the decisions below read as the page. */}
      <header className="flex flex-col gap-1">
        <h1 className="type-heading text-pretty break-words">
          {title || [repo, branch].filter(Boolean).join(" on ") || "Untitled session"}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 type-body text-text-2">
          <StatusBadge status={status} />
          {repo && <Code>{repo}</Code>}
          {branch && <Code>{branch}</Code>}
          {meta && <span className="data">{meta}</span>}
        </div>
      </header>

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
        <div className="flex flex-col gap-4">
          <p className="type-body text-text-2">
            Each card is one decision your agent made. Explain why in your own words; the reason and
            its quote open after you answer.
          </p>
          {/* More room between decisions than inside one, so each heading groups with its own card. */}
          <div className="flex flex-col gap-8">
            {cards.map((card) =>
              card.locked ? (
                <LockedDecisionCard key={card.id} card={card} />
              ) : (
                <DecisionCard key={card.id} card={card} />
              ),
            )}
          </div>
        </div>
      )}
    </Container>
  );
}
