import type { SessionStatus } from "@session-coach/shared/session";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemContent, ItemGroup } from "@/components/ui/item";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

import { StatRow } from "./stat-row";
import { StatusBadge } from "./status-badge";

// Skeletons in the geometry of the real thing, so nothing moves when the data lands. The blocks are aria-hidden;
// each loader says once, in a status region, what is loading.
// shortcut: no SkeletonText or SkeletonSwap in components/ui yet, so the lines are fixed h-4/h-5 boxes and the caller
// swaps on its own loading flag; add both to ui/skeleton.tsx to match type roles and skip the flash on fast loads.

function Loading({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div aria-busy="true" className="flex min-w-0 flex-col">
      <output className="sr-only">{label}</output>
      {children}
    </div>
  );
}

/** The dashboard's session list: SessionRow's title, repo, time and status word. At most 8 rows. */
export function SessionListLoading({ rows = 4 }: { rows?: number }) {
  return (
    <Loading label="Loading sessions">
      <ItemGroup aria-hidden>
        {Array.from({ length: Math.min(rows, 8) }, (_, row) => (
          <Item key={row}>
            <ItemContent>
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24" />
            </ItemContent>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </Item>
        ))}
      </ItemGroup>
    </Loading>
  );
}

/** One decision card on /s/[id]: header, decision, why, an evidence quote, the question. */
export function DecisionCardLoading() {
  return (
    <Loading label="Loading decision cards">
      <Card size="lg" aria-hidden>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-4 w-2/3" />
        </CardFooter>
      </Card>
    </Loading>
  );
}

/** The dashboard's stats strip, holding each value's box. */
export function StatRowLoading() {
  return (
    <Loading label="Loading your stats">
      <StatRow loading />
    </Loading>
  );
}

/** The quiz on /review/[cardId]: decision, question, the answer box and the submit button. */
export function ReviewCardLoading() {
  return (
    <Loading label="Loading the card">
      <Card size="lg" aria-hidden>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-(--control) w-32" />
        </CardFooter>
      </Card>
    </Loading>
  );
}

/**
 * A session still being turned into cards: pending (uploaded, waiting for the pipeline) or processing. Realtime
 * replaces it when the status settles.
 */
export function ProcessingState({
  status,
}: {
  status: Extract<SessionStatus, "pending" | "processing">;
}) {
  const processing = status === "processing";
  return (
    <Empty>
      <StatusBadge status={status} />
      <EmptyHeader>
        <EmptyTitle>
          {processing ? "Making cards from this session" : "Waiting to start"}
        </EmptyTitle>
        <EmptyDescription>
          Each session becomes 3 to 5 decision cards. This page updates when they are ready.
        </EmptyDescription>
      </EmptyHeader>
      {/* TODO(zia): a time estimate, once the pipeline reports one. */}
      <Progress value={null}>
        <ProgressLabel>{processing ? "Reading the session" : "Uploaded"}</ProgressLabel>
      </Progress>
    </Empty>
  );
}
