import type { SessionStatus } from "@session-coach/shared/session";

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Progress, ProgressLabel } from "@/components/ui/progress";

import { StatusBadge } from "./status-badge";

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
          Each session becomes up to 5 decision cards. This page updates when they are ready.
        </EmptyDescription>
      </EmptyHeader>
      {/* TODO(zia): a time estimate, once the pipeline reports one. */}
      <Progress value={null}>
        <ProgressLabel>{processing ? "Reading the session" : "Uploaded"}</ProgressLabel>
      </Progress>
    </Empty>
  );
}
