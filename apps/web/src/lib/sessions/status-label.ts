import type { SessionStatus } from "@session-coach/shared/session";

// Shared by dashboard rows and sidebar sessions so each state has one learner-facing label.

/** What a ready session with no visible cards says: nothing is waiting to be reviewed. */
export const NO_DECISIONS = "No decisions";

/** A ready session whose visible card count is known to be 0. An unknown count (undefined) is not empty. */
export function isEmptyReady(status: SessionStatus, cardCount?: number): boolean {
  return status === "ready" && cardCount === 0;
}

const labels: Record<Exclude<SessionStatus, "ready">, string> = {
  pending: "Queued",
  processing: "Preparing decisions",
  failed: "Needs attention",
};

/**
 * The word for a session's status. Only a ready session with 0 visible cards changes.
 *
 * @param status - The session's status.
 * @param cardCount - Visible cards; undefined until known.
 * @param options.ready - An optional replacement for the default ready label, "Ready to explore".
 */
export function sessionLabel(
  status: SessionStatus,
  cardCount?: number,
  { ready = "Ready to explore" }: { ready?: string } = {},
): string {
  if (status === "ready") return isEmptyReady(status, cardCount) ? NO_DECISIONS : ready;
  return labels[status];
}
