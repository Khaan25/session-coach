import "server-only";

import type { ReviewStep } from "./cards";
import { sampleSessions } from "./sessions";

// SAMPLE numbers for the progress page. TODO(zia): compute them in src/lib/review/progress.ts (Phase 7).

/** SAMPLE: mastered cards plus cards scored 2 in the last 7 days (ARCHITECTURE.md, "Progress"), out of all visible cards. */
export const sampleHeadline = { canStillExplain: 5, totalCards: 9 };

/** SAMPLE: how many cards sit at each review step. */
export const sampleSteps: Record<ReviewStep, number> = {
  new: 1,
  "day-1": 2,
  "day-3": 2,
  "day-7": 1,
  mastered: 3,
};

/** SAMPLE: answers per day over the last 30 days, ending on the sample "today" (Oct 29). */
const answerCounts = [
  0, 0, 1, 0, 2, 0, 0, 3, 1, 0, 0, 2, 2, 0, 1, 0, 0, 0, 3, 2, 1, 0, 0, 2, 4, 1, 0, 3, 2, 2,
];
export const sampleAnswersPerDay = answerCounts.map((answers, index) => ({
  // Sep 30 + index, written out so render never builds a date.
  day: index === 0 ? "Sep 30" : `Oct ${index}`,
  answers,
}));

/** SAMPLE: answers by score over the same 30 days. */
export const sampleScoreMix = { 2: 21, 1: 8, 0: 3 } as const;

/** SAMPLE: cards mastered per ready session. */
export const sampleSessionProgress = [
  ...sampleSessions
    .filter(({ session }) => session.status === "ready")
    .map(({ session, cardCount = 0 }) => ({
      id: session.id,
      title:
        session.title ||
        [session.repo, session.branch].filter(Boolean).join(" on ") ||
        "Untitled session",
      mastered: 1,
      total: cardCount,
    })),
  { id: "sample-older-1", title: "SAMPLE: set up RLS for answers", mastered: 2, total: 4 },
  { id: "sample-older-2", title: "SAMPLE: add the Play Stats API", mastered: 0, total: 2 },
];
