// Synthetic review rows: the pages' loading skeletons draw their shape from them, and /canvas draws the pages with
// them. A queue row and a quiz card carry only the decision and the question; a grade is what the route returns once
// an answer is in.

import type { Grade } from "@/components/review/quiz-form";
import type { QueueCard, QuizCard } from "@/lib/review/queries";

const row = (i: number, decision: string, sessionName: string, step: QueueCard["step"]) => ({
  id: `sample-${i}`,
  decision,
  question: "",
  sessionId: `sample-session-${i}`,
  sessionName,
  repo: null,
  step,
  dueOn: null,
  createdAt: "2026-11-03T09:00:00Z",
});

export const SAMPLE_REVIEW_QUEUE: QueueCard[] = [
  row(
    0,
    "Rate limit the upload route per token, not per IP",
    "Add rate limiting to the upload route",
    1,
  ),
  row(1, "Render auth emails with React Email at build time", "Move auth emails to React Email", 0),
  row(
    2,
    "Save the tracker title on blur, not on every key",
    "Fix the tracker's inline title edit",
    2,
  ),
];

export const SAMPLE_QUIZ_CARD: QuizCard = {
  id: "sample-card",
  decision: "Rate limit uploads per token, not per IP",
  question: "Why is the limit keyed on the token rather than the IP?",
  sessionId: "sample-session",
  sessionName: "Add rate limiting to the upload route",
};

const evidence: Grade["evidence"] = [
  {
    quote: "Key the limiter on the CLI token so one office IP can't block everyone.",
    event_index: 41,
    file: "apps/web/src/app/api/sessions/route.ts",
    lines: [12, 30],
    verified: true,
  },
];

/** What the grading route returns for each score; the why and model answer only reach the page after an answer. */
export const SAMPLE_GRADES: Record<0 | 1 | 2, Grade> = {
  2: {
    score: 2,
    missing: "",
    why: "Learners share office and school IPs, so an IP key would let one learner's uploads block another's.",
    modelAnswer:
      "The token names one learner's CLI. Keying on it limits that learner alone; an IP is shared by everyone behind it.",
    evidence,
    nextDue: "2026-11-07",
    dropped: false,
  },
  1: {
    score: 1,
    missing: "Why a shared IP is the problem: everyone behind it would hit one limit.",
    why: "Learners share office and school IPs, so an IP key would let one learner's uploads block another's.",
    modelAnswer:
      "The token names one learner's CLI. Keying on it limits that learner alone; an IP is shared by everyone behind it.",
    evidence,
    nextDue: "2026-11-04",
    dropped: true,
  },
  0: {
    score: 0,
    missing: "The reason: an IP is shared, a token belongs to one learner.",
    why: "Learners share office and school IPs, so an IP key would let one learner's uploads block another's.",
    modelAnswer:
      "The token names one learner's CLI. Keying on it limits that learner alone; an IP is shared by everyone behind it.",
    evidence,
    nextDue: "2026-11-04",
    dropped: true,
  },
};
