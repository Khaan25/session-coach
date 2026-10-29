import "server-only";

import sample from "@session-coach/shared/fixtures/session.sample.json";
import { getEvidenceFlags } from "@session-coach/shared/decision";
import { sessionSchema, type Session } from "@session-coach/shared/session";

// SAMPLE data for the UI-only pages. TODO(zia): replace with the learner's rows from Supabase (Phase 4 and 5).

/** SAMPLE: the fixed clock the sample pages measure "3 hours ago" and "due today" from. Never the real clock. */
export const SAMPLE_NOW = new Date("2026-10-29T09:00:00+05:45");

const fixture = sessionSchema.parse(sample.session);

/** The columns the dashboard selects (plan, Phase 4 step 1). */
export type SessionSummary = Pick<
  Session,
  | "id"
  | "title"
  | "repo"
  | "branch"
  | "started_at"
  | "duration_min"
  | "status"
  | "error"
  | "created_at"
>;

/** SAMPLE sessions in the states the fixture doesn't cover. Ids, titles and errors are made up. */
const extraSessions: SessionSummary[] = [
  {
    id: "7e3a2b2c-5d6e-4f8a-9b0c-1d2e3f4a5b62",
    title: null,
    repo: "session-coach",
    branch: "kasam/upload-route",
    started_at: "2026-10-29T08:30:00+05:45",
    duration_min: 21,
    status: "pending",
    error: null,
    created_at: "2026-10-29T08:52:00+05:45",
  },
  {
    id: "6d2f1a1b-4c5d-4e7f-8a9b-0c1d2e3f4a51",
    title: "SAMPLE: add the review schedule",
    repo: "session-coach",
    branch: "zia/review-schedule",
    started_at: "2026-10-29T08:05:00+05:45",
    duration_min: 38,
    status: "processing",
    error: null,
    created_at: "2026-10-29T08:44:00+05:45",
  },
  {
    id: "8f4b3c3d-6e7f-4a9b-8c1d-2e3f4a5b6c73",
    title: "SAMPLE: migrate the cron to Vercel",
    repo: "rapporteur",
    branch: "main",
    started_at: "2026-10-28T11:10:00+05:45",
    duration_min: 64,
    status: "failed",
    // TODO(zia): the real learner-readable pipeline errors.
    error: "SAMPLE: the session log was empty after filtering, so there were no decisions to read.",
    created_at: "2026-10-28T12:20:00+05:45",
  },
];

/** Visible cards per ready session (hidden ones excluded). */
const visibleCardCount = sample.cards.filter(
  (card) => !getEvidenceFlags(card.evidence).hidden,
).length;

/** SAMPLE: the learner's sessions, newest first (the extras are all newer than the fixture), with the card count for ready ones. */
export const sampleSessions: { session: SessionSummary; cardCount?: number }[] = [
  ...extraSessions.map((session) => ({ session })),
  { session: fixture, cardCount: visibleCardCount },
];

export function getSampleSession(id: string): SessionSummary | undefined {
  return sampleSessions.find(({ session }) => session.id === id)?.session;
}

export const sampleSessionIds = sampleSessions.map(({ session }) => session.id);

/** SAMPLE: the dashboard's stats strip. */
export const sampleStats = { cardsDueToday: 2, sessionsThisWeek: 4, explainedPercent: 67 };
