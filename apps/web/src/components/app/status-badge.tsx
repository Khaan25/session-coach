import type { SessionStatus } from "@session-coach/shared/session";

import { Status, type StatusValue } from "@/components/ui/status";

// A session's status as Quartz's status word: queued and running in ink (running with the turning arc), ready in
// secondary text, failed in fail text. The word carries the status, never the hue alone.
const statusOf: Record<SessionStatus, { status: StatusValue; label: string }> = {
  pending: { status: "queued", label: "Queued" },
  processing: { status: "running", label: "Making cards" },
  ready: { status: "ok", label: "Ready" },
  failed: { status: "fail", label: "Failed" },
};

/** `live` announces the word once when the status settles on ready or failed (for a Realtime-updated row). */
export function StatusBadge({ status, live }: { status: SessionStatus; live?: boolean }) {
  return <Status {...statusOf[status]} live={live} />;
}
