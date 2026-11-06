import type { SessionStatus } from "@session-coach/shared/session";

import { Status, type StatusValue } from "@/components/ui/status";
import { isEmptyReady, sessionLabel } from "@/lib/sessions/status-label";

// A session's status as the design system's status word: queued and running in ink (running with the turning arc), ready in
// secondary text, failed in fail text. The word carries the status, never the hue alone.
const statusOf: Record<SessionStatus, StatusValue> = {
  pending: "queued",
  processing: "running",
  ready: "ok",
  failed: "fail",
};

/**
 * `live` announces the word once when the status settles on ready or failed (for a Realtime-updated row).
 * `cardCount` is the visible cards; a ready session with 0 says "No decisions" in the idle (lighter) text. Without it
 * the badge is as before.
 */
export function StatusBadge({
  status,
  cardCount,
  live,
}: {
  status: SessionStatus;
  cardCount?: number;
  live?: boolean;
}) {
  return (
    <Status
      status={isEmptyReady(status, cardCount) ? "idle" : statusOf[status]}
      label={sessionLabel(status, cardCount)}
      live={live}
    />
  );
}
