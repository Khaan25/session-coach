"use client";

import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import type { OwnershipCount } from "@/lib/progress/ownership";

// A client component only because ProgressValue takes a render function, which can't cross from the server.

const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0);

/** /progress's explained and owned bars, each with its definition under it. */
export function ExplainedOwnedBars({ counts }: { counts: OwnershipCount }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Progress value={pct(counts.explained, counts.total)}>
          <ProgressLabel>Explained</ProgressLabel>
          <ProgressValue>{() => `${counts.explained} of ${counts.total}`}</ProgressValue>
        </Progress>
        <p className="type-body-sm text-text-2">
          You answered it in your own words and the grader scored it Explained, at least once.
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <Progress value={pct(counts.owned, counts.total)}>
          <ProgressLabel>Owned</ProgressLabel>
          <ProgressValue>{() => `${counts.owned} of ${counts.total}`}</ProgressValue>
        </Progress>
        <p className="type-body-sm text-text-2">
          You still explained it on day 11, after three spaced reviews. That is the goal for every
          card.
        </p>
      </div>
    </div>
  );
}
