import { AppPageHeader } from "@/components/app/page-header";
import { Container } from "@/components/app/container";
import {
  EmptyState,
  NoCardsDueEmpty,
  NoResultsEmpty,
  NoReviewsEmpty,
  NoSessionsEmpty,
} from "@/components/app/empty-state";
import {
  ErrorState,
  LoadFailedState,
  NotFoundState,
  SessionFailedState,
} from "@/components/app/error-state";
import {
  DecisionCardLoading,
  ProcessingState,
  ReviewCardLoading,
  SessionListLoading,
  StatRowLoading,
} from "@/components/app/loading-state";
import { ScoreBadge } from "@/components/app/score-badge";
import { SessionRow } from "@/components/app/session-row";
import { StatRow } from "@/components/app/stat-row";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { ItemGroup } from "@/components/ui/item";

import { GallerySection, Specimen } from "./gallery-section";
import { cards, session } from "./sample";

// A fixed clock, so the relative times prerender the same on every build.
const NOW = new Date("2026-10-29T12:00:00+05:45");

const SESSIONS = [
  { ...session, status: "ready" as const },
  { ...session, id: "processing", title: null, status: "processing" as const },
  { ...session, id: "pending", status: "pending" as const },
  {
    ...session,
    id: "failed",
    status: "failed" as const,
    error: "TODO(zia): a learner-readable pipeline error",
  },
];

/** The app-level blocks in components/app, in every state, on the sample session. */
export function AppCatalog() {
  return (
    <GallerySection
      id="app"
      title="App blocks"
      description="components/app: the dashboard's page frame, states and session badges, built on components/ui."
    >
      <Specimen label="Container and AppPageHeader">
        <Container className="frame">
          <AppPageHeader
            title="Dashboard"
            description="Explain back the decisions your coding agent made."
            actions={<Button variant="secondary">TODO(zia)</Button>}
          />
        </Container>
      </Specimen>

      <Specimen label="StatusBadge: every session status">
        <StatusBadge status="pending" />
        <StatusBadge status="processing" />
        <StatusBadge status="ready" />
        <StatusBadge status="failed" />
      </Specimen>

      <Specimen label="ScoreBadge: every score">
        <ScoreBadge score={2} />
        <ScoreBadge score={1} />
        <ScoreBadge score={0} />
      </Specimen>

      <Specimen label="StatRow: values, no reviews yet, loading">
        <div className="flex w-full flex-col gap-3">
          <StatRow cardsDueToday={cards.length} sessionsThisWeek={1} explainedPercent={67} />
          <StatRow cardsDueToday={0} sessionsThisWeek={0} explainedPercent={null} />
          <StatRowLoading />
        </div>
      </Specimen>

      <Specimen label="SessionRow: ready (links to its cards), processing (repo fallback), pending, failed">
        <ItemGroup className="w-full">
          {SESSIONS.map((row) => (
            <SessionRow
              key={row.id}
              session={row}
              cardCount={row.status === "ready" ? cards.length : undefined}
              now={NOW}
            />
          ))}
        </ItemGroup>
      </Specimen>

      <Specimen label="EmptyState: presets and a custom one">
        <div className="grid w-full gap-3 md:grid-cols-2">
          <NoSessionsEmpty />
          <NoCardsDueEmpty />
          <NoReviewsEmpty />
          <NoResultsEmpty query="parser" variant="framed" />
          <EmptyState title="TODO(zia)" description="A custom empty state with no icon." />
        </div>
      </Specimen>

      <Specimen label="ErrorState: session failed, load failed with retry and code, not found, announced">
        <div className="grid w-full gap-3 md:grid-cols-2">
          <SessionFailedState error={SESSIONS[3].error} />
          <SessionFailedState error={null} />
          <LoadFailedState
            noun="your sessions"
            code="TODO(zia): request id"
            action={<Button variant="secondary">Try again</Button>}
          />
          <NotFoundState />
          <ErrorState
            title="Couldn't save your answer"
            message="Your answer is still in the box. Try again in a moment."
            announce
            action={<Button variant="secondary">Try again</Button>}
          />
        </div>
      </Specimen>

      <Specimen label="Loading: session list, decision card, review card">
        <div className="grid w-full gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <SessionListLoading rows={3} />
          </div>
          <DecisionCardLoading />
          <ReviewCardLoading />
        </div>
      </Specimen>

      <Specimen label="Pending and processing: a session being turned into cards">
        <div className="grid w-full gap-3 md:grid-cols-2">
          <ProcessingState status="pending" />
          <ProcessingState status="processing" />
        </div>
      </Specimen>
    </GallerySection>
  );
}
