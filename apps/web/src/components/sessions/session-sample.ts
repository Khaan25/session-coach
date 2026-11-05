// A synthetic session: /s/[id]'s loading skeleton draws its shape from it, and /canvas draws the page with it. Cards
// are locked, as most are on a learner's first visit: no why, evidence or answer key until they answer.

import type { SessionCard } from "@/lib/cards/columns";
import type { SessionSummary } from "@/lib/sessions/rows";

export const SAMPLE_SESSION_NOW = new Date("2026-11-03T09:00:00Z");

export const SAMPLE_SESSION: SessionSummary = {
  id: "sample-session",
  title: "Add rate limiting to the upload route",
  repo: "session-coach",
  branch: "zia/rate-limit",
  started_at: new Date(SAMPLE_SESSION_NOW.getTime() - 3 * 3_600_000).toISOString(),
  duration_min: 42,
  status: "ready",
  error: null,
  created_at: SAMPLE_SESSION_NOW.toISOString(),
};

const locked = (position: number, decision: string, question: string): SessionCard => ({
  locked: true,
  id: `sample-card-${position}`,
  position,
  decision,
  question,
});

export const SAMPLE_SESSION_CARDS: SessionCard[] = [
  locked(
    0,
    "Rate limit the upload route per token, not per IP",
    "Why is the limit keyed on the token rather than the IP?",
  ),
  locked(
    1,
    "Return 429 with a Retry-After header",
    "Why does the route send Retry-After instead of only a 429?",
  ),
];
