import type { SessionStatus } from "@session-coach/shared/session";

import { Status, type StatusValue } from "@/components/ui/status";
import { isEmptyReady, NO_DECISIONS } from "@/lib/sessions/status-label";

// A session's status as the design system's status word: queued and running in ink (running with the turning arc), ready in
// secondary text, failed in fail text. The word carries the status, never the hue alone.
const statusOf: Record<SessionStatus, { status: StatusValue; label: string }> = {
  pending: { status: "queued", label: "Queued" },
  processing: { status: "running", label: "Making cards" },
  ready: { status: "ok", label: "Ready" },
  failed: { status: "fail", label: "Failed" },
};

/**
 * `live` announces the word once when the status settles on ready or failed (for a Realtime-updated row).
 * `cardCount` is the visible cards; a ready session with 0 says "No decisions found" in the idle (lighter) text. Without it
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
  if (isEmptyReady(status, cardCount)) {
    return <Status status="idle" label={NO_DECISIONS} live={live} />;
  }
  return <Status {...statusOf[status]} live={live} />;
}
