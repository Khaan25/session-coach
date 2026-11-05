"use client";

// The picked dashboard, option B: the real DashboardView (components/dashboard/dashboard-view.tsx) that /dashboard
// renders, fed the synthetic rows in dashboard-sample.ts. Nothing here calls an API, and no card shows its why.

import { DashboardView, FirstSessionEmpty } from "@/components/dashboard/dashboard-view";
import {
  SAMPLE_NOW,
  SAMPLE_OWNERSHIP,
  SAMPLE_QUEUE,
  SAMPLE_REPOS,
  SAMPLE_SESSIONS,
} from "@/components/dashboard/dashboard-sample";
import { Container } from "@/components/app/container";
import { SessionRows } from "@/components/sessions/session-list";
import type { EmptyQueue } from "@/lib/review/queries";

import { AppFrame } from "../frames";

const href = (repo: string | null) => (repo ? `/dashboard?repo=${repo}` : "/dashboard");

/** Why the due block has no cards: the day's 5 are done, or nothing is due today. */
const EMPTY_DUE: Record<"done" | "caught-up", EmptyQueue> = {
  done: { hasCards: true, doneToday: true, nextDue: "2026-11-04", today: "2026-11-03" },
  "caught-up": { hasCards: true, doneToday: false, nextDue: "2026-11-04", today: "2026-11-03" },
};

export function DashboardHomeOptionB({
  initialRepo: repo = null,
  empty,
  before,
}: {
  /** The project filter to open on. */
  initialRepo?: string | null;
  /** Show the due block with no cards, and why. */
  empty?: keyof typeof EMPTY_DUE;
  /** Drawn under the header, where the real page puts a new project's question-level card. */
  before?: React.ReactNode;
} = {}) {
  const queue = empty ? [] : SAMPLE_QUEUE;
  const due = queue.filter((card) => !repo || card.repo === repo);
  const next = due[0] ?? queue[0];
  return (
    <AppFrame path={href(repo)} dueCount={queue.length}>
      <Container>
        <DashboardView
          firstVisit={false}
          before={before}
          tabs={[null, ...SAMPLE_REPOS].map((name) => ({ repo: name, href: href(name) }))}
          repo={repo}
          queue={queue}
          due={due}
          empty={empty ? EMPTY_DUE[empty] : null}
          ownership={SAMPLE_OWNERSHIP}
          anatomy={
            next ? { decision: next.decision, question: next.question, step: next.step } : null
          }
          sessions={
            <SessionRows
              rows={SAMPLE_SESSIONS.filter((session) => !repo || session.repo === repo)}
              now={SAMPLE_NOW}
            />
          }
        />
      </Container>
    </AppFrame>
  );
}

export function DashboardHomeOptionBEmpty() {
  return (
    <AppFrame path="/dashboard" sessions={[]} dueCount={0}>
      <Container>
        <DashboardView
          firstVisit
          tabs={null}
          repo={null}
          queue={[]}
          due={[]}
          empty={null}
          ownership={{ overall: { explained: 0, owned: 0, total: 0 }, repos: [] }}
          anatomy={null}
          sessions={<FirstSessionEmpty />}
        />
      </Container>
    </AppFrame>
  );
}
