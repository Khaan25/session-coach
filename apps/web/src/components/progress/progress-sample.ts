// A synthetic learner's progress: /progress's loading skeleton draws its shape from it, and /canvas draws the page with
// it. 39 visible cards, and the numbers add up. Only decision titles; never a why or an answer key.

import type { ProgressPageData } from "@/components/progress/progress-view";
import { CHART_DAYS } from "@/lib/progress/progress";

export const SAMPLE_PROGRESS: ProgressPageData = {
  progress: {
    canStillExplain: 30,
    totalCards: 39,
    steps: { new: 6, "day-1": 5, "day-4": 7, "day-11": 4, mastered: 17 },
    answersPerDay: Array.from({ length: CHART_DAYS }, (_, i) => ({
      // Oct 5 to Nov 3.
      day: i < 27 ? `Oct ${i + 5}` : `Nov ${i - 26}`,
      answers: [3, 0, 2, 4, 1, 5, 2][i % 7]!,
    })),
    scoreMix: { 2: 41, 1: 12, 0: 4 },
    bySession: [
      { id: "7f3a2c91", title: "Add rate limiting to the upload route", mastered: 10, total: 22 },
      { id: "0d4f6b38", title: "Stream the CLI upload", mastered: 7, total: 17 },
    ],
  },
  ownership: {
    overall: { explained: 30, owned: 17, total: 39 },
    repos: [{ repo: "session-coach", explained: 30, owned: 17, total: 39 }],
  },
  dueToday: 3,
  dueOnDay11: 1,
  repo: null,
  repos: null,
};
