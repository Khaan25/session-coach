"use client";

// The picked Progress, option C: the real ProgressSummary (components/progress/progress-view.tsx) that /progress
// renders, fed the synthetic learner in progress-sample.ts. Nothing here calls an API.

import { SAMPLE_PROGRESS } from "@/components/progress/progress-sample";
import { progressHref, ProgressSummary } from "@/components/progress/progress-view";

import { AppFrame } from "../frames";

export function ProgressSettingsProgressOptionC({ repo = null }: { repo?: string | null } = {}) {
  return (
    <AppFrame path={progressHref(repo)}>
      <ProgressSummary
        data={{ ...SAMPLE_PROGRESS, repo, repos: ["rapporteur", "session-coach"] }}
      />
    </AppFrame>
  );
}
