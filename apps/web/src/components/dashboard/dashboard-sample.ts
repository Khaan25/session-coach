// Synthetic Today rows: the page's loading skeleton draws its shape from them, and /canvas draws Today with them.
// No real learner, and never a why or an answer key: a queue card carries only its decision and question.

import type { QueueCard } from "@/lib/review/queries";
import type { SessionListItem } from "@/lib/sessions/rows";

export const SAMPLE_NOW = new Date("2026-11-03T09:00:00Z");

const session = (
  i: number,
  title: string,
  repo: string,
  status: SessionListItem["status"],
  cardCount?: number,
): SessionListItem => ({
  id: `sample-${i}`,
  title,
  repo,
  branch: null,
  started_at: null,
  duration_min: null,
  status,
  error: status === "failed" ? "The log was empty after redaction." : null,
  created_at: new Date(SAMPLE_NOW.getTime() - (i * 9 + 2) * 3_600_000).toISOString(),
  cardCount,
});

const SAMPLE_SESSIONS: SessionListItem[] = [
  session(0, "Add rate limiting to the upload route", "session-coach", "ready", 4),
  session(1, "Write transcriptParser.ts", "rapporteur", "processing"),
  session(2, "Move email to Resend", "session-coach", "failed"),
  session(3, "Stream the CLI upload", "session-coach", "ready", 4),
];

const card = (
  i: number,
  decision: string,
  question: string,
  repo: string,
  step: QueueCard["step"],
): QueueCard => ({
  id: `sample-card-${i}`,
  decision,
  question,
  sessionId: `sample-${i}`,
  sessionName: SAMPLE_SESSIONS[i === 2 ? 1 : 0]!.title ?? "",
  repo,
  step,
  dueOn: null,
  createdAt: SAMPLE_NOW.toISOString(),
});

export const SAMPLE_QUEUE: QueueCard[] = [
  card(
    0,
    "Rate limit the upload route per token, not per IP",
    "Why is the limit keyed on the token rather than the IP?",
    "session-coach",
    2,
  ),
  card(
    1,
    "Return 429 with a Retry-After header",
    "Why does the route send Retry-After instead of only a 429?",
    "session-coach",
    1,
  ),
  card(
    2,
    "Skip unknown JSONL line types instead of throwing",
    "Why does the parser skip a line type it doesn't know?",
    "rapporteur",
    1,
  ),
];
