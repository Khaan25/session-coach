import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MeasuredSuspense } from "@/components/app/measured-suspense";
import { NoCardsYetEmpty, NoReviewsEmpty } from "@/components/app/empty-state";
import type { Score } from "@/components/app/score-badge";
import { SAMPLE_PROGRESS } from "@/components/progress/progress-sample";
import {
  ProgressEmpty,
  ProgressSummary,
  type ProgressPageData,
} from "@/components/progress/progress-view";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { Progress as ProgressData } from "@/lib/progress/progress";
import { getOwnership, getProgress } from "@/lib/progress/queries";
import { listProjects } from "@/lib/projects/queries";
import { reviewQueue } from "@/lib/review/queries";
import { cardlessReason } from "@/lib/sessions/queries";
import { parseRepo } from "@/lib/sessions/rows";

export const metadata: Metadata = { title: "Progress" };

const scores: Score[] = [2, 1, 0];

export default function ProgressPage({ searchParams }: PageProps<"/progress">) {
  // Skullet measures the real page, drawn from sample progress, so each card keeps its shape when the data lands. The
  // session count and the project tabs aren't known until then, so those can still grow or shrink.
  return (
    <MeasuredSuspense
      label="Loading your progress"
      skeleton={<ProgressSummary data={SAMPLE_PROGRESS} />}
    >
      <ProgressView searchParams={searchParams} />
    </MeasuredSuspense>
  );
}

// Reads the signed-in learner's rows, so it renders inside Suspense (cacheComponents). A failed read throws to
// error.tsx, which offers a retry.
async function ProgressView({ searchParams }: Pick<PageProps<"/progress">, "searchParams">) {
  const user = await getCurrentUser();
  const repo = parseRepo((await searchParams).repo);
  const data = user ? await load(user.id, repo) : null;
  // A repo the learner has no session in: show every project rather than an empty page, as the dashboard does.
  if (repo && data?.repos && !data.repos.includes(repo)) redirect("/progress");

  // No card: `cardlessReason` picks the copy (first run points at the CLI; a session being read, a failed one, or
  // sessions that gave none point at the sessions). Cards but no answer yet point at the queue. A project picked
  // from the tabs keeps the page and its tabs, even at zero.
  if (!user || !data) return <ProgressEmpty empty={<NoCardsYetEmpty />} />;
  const { progress } = data;
  if (repo) return <ProgressSummary data={data} />;
  if (progress.totalCards === 0) {
    return <ProgressEmpty empty={<NoCardsYetEmpty cardless={await cardlessReason(user.id)} />} />;
  }
  if (progress.steps.new === progress.totalCards && answeredCount(progress) === 0) {
    return <ProgressEmpty empty={<NoReviewsEmpty />} />;
  }
  return <ProgressSummary data={data} />;
}

const answeredCount = (progress: ProgressData) =>
  scores.reduce<number>((sum, score) => sum + progress.scoreMix[score], 0);

/** Reads the clock outside render (cacheComponents and the compiler's purity rule), then the learner's rows. */
async function load(userId: string, repo: string | null): Promise<ProgressPageData> {
  const now = new Date();
  const [progress, ownership, queue, projects] = await Promise.all([
    getProgress(userId, now, repo),
    getOwnership(),
    // The queue rather than its count: the banner says how many of today's cards are on their day 11 review.
    reviewQueue(userId, now),
    // Only the tabs need it, so a failed read hides them instead of failing the page.
    listProjects(userId).catch((error: unknown) => {
      console.error("[progress] listProjects", error);
      return null;
    }),
  ]);
  return {
    progress,
    ownership,
    dueToday: queue.length,
    dueOnDay11: queue.filter((card) => card.step === 3).length,
    repo,
    repos: projects?.map((project) => project.repo) ?? null,
  };
}
