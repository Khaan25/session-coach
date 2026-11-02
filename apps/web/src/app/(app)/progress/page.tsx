import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/app/container";
import { MeasuredSuspense } from "@/components/app/measured-suspense";
import { NoCardsYetEmpty, NoReviewsEmpty } from "@/components/app/empty-state";
import { AppPageHeader } from "@/components/app/page-header";
import { ScoreBadge, type Score } from "@/components/app/score-badge";
import { AnswersChart } from "@/components/progress/answers-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { PageHeaderStat, PageHeaderStats } from "@/components/ui/page-header";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Stat, StatGroup, StatLabel, StatValue } from "@/components/ui/stat";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  CHART_DAYS,
  REVIEW_STEPS,
  stepLabels,
  type Progress as ProgressData,
} from "@/lib/progress/progress";
import { getProgress } from "@/lib/progress/queries";
import { cardlessReason } from "@/lib/sessions/queries";

export const metadata: Metadata = { title: "Progress" };

const scores: Score[] = [2, 1, 0];
const description = "Mastered cards, plus cards you explained in full in the last 7 days.";

// Only the skeleton's shape comes from this: counts, days and session titles like a real learner's.
const SAMPLE_PROGRESS: ProgressData = {
  canStillExplain: 5,
  totalCards: 9,
  steps: { new: 2, "day-1": 2, "day-3": 1, "day-7": 1, mastered: 3 },
  answersPerDay: Array.from({ length: CHART_DAYS }, (_, i) => ({
    day: `Oct ${i + 1}`,
    answers: (i * 7) % 4,
  })),
  scoreMix: { 2: 21, 1: 8, 0: 3 },
  bySession: [
    { id: "sample-0", title: "Add rate limiting to the upload route", mastered: 2, total: 4 },
    { id: "sample-1", title: "Move auth emails to React Email", mastered: 1, total: 3 },
    { id: "sample-2", title: "Stream the CLI upload", mastered: 0, total: 2 },
  ],
};

export default function ProgressPage() {
  // Skullet measures the real page, drawn from sample progress, so each card keeps its shape when the data lands. The
  // session count isn't known until then, so the last list can still grow or shrink.
  return (
    <MeasuredSuspense
      label="Loading your progress"
      skeleton={<ProgressSummary progress={SAMPLE_PROGRESS} />}
    >
      <ProgressView />
    </MeasuredSuspense>
  );
}

// Reads the signed-in learner's rows, so it renders inside Suspense (cacheComponents). A failed read throws to
// error.tsx, which offers a retry.
async function ProgressView() {
  const user = await getCurrentUser();
  const progress = user ? await load(user.id) : null;

  // No card: `cardlessReason` picks the copy (first run points at the CLI; a session being read, a failed one, or
  // sessions that gave none point at the sessions). Cards but no answer yet point at the queue.
  if (!user || !progress) return <ProgressEmpty empty={<NoCardsYetEmpty />} />;
  if (progress.totalCards === 0) {
    return <ProgressEmpty empty={<NoCardsYetEmpty cardless={await cardlessReason(user.id)} />} />;
  }
  if (progress.steps.new === progress.totalCards && answeredCount(progress) === 0) {
    return <ProgressEmpty empty={<NoReviewsEmpty />} />;
  }
  return <ProgressSummary progress={progress} />;
}

function ProgressEmpty({ empty }: { empty: React.ReactNode }) {
  return (
    <Container>
      <AppPageHeader title="Progress" description={description} />
      {empty}
    </Container>
  );
}

const answeredCount = (progress: ProgressData) =>
  scores.reduce<number>((sum, score) => sum + progress.scoreMix[score], 0);

function ProgressSummary({ progress }: { progress: ProgressData }) {
  const answered = answeredCount(progress);
  return (
    <Container>
      {/* skullet-own: static text stays real in the skeleton; only the learner's numbers are drawn as bars. The spans
          set their own colour because skullet makes the colour they would inherit transparent. */}
      <AppPageHeader
        title={
          <span skullet-own="" className="text-text-1">
            Progress
          </span>
        }
        description={
          <span skullet-own="" className="text-text-2">
            {description}
          </span>
        }
      >
        <PageHeaderStats>
          <PageHeaderStat
            label="Decisions you can still explain"
            value={progress.canStillExplain}
            detail={`of ${progress.totalCards} cards`}
          />
          <PageHeaderStat label="Mastered" value={progress.steps.mastered} />
        </PageHeaderStats>
      </AppPageHeader>

      <Card>
        <CardHeader>
          <CardTitle skullet-own="">
            <h2>Cards by step</h2>
          </CardTitle>
        </CardHeader>
        <StatGroup variant="plain">
          {REVIEW_STEPS.map((step) => (
            <Stat key={step}>
              <StatLabel>{stepLabels[step]}</StatLabel>
              <StatValue>{progress.steps[step]}</StatValue>
            </Stat>
          ))}
        </StatGroup>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle skullet-own="">
              <h2>Answers per day</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnswersChart data={progress.answersPerDay} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle skullet-own="">
              <h2>Score mix</h2>
            </CardTitle>
            <CardDescription>
              {answered > 0
                ? `${answered} answers in the last ${progress.answersPerDay.length} days.`
                : `No answers in the last ${progress.answersPerDay.length} days.`}
            </CardDescription>
          </CardHeader>
          {answered > 0 && (
            <CardContent>
              {scores.map((score) => (
                <Progress
                  key={score}
                  value={Math.round((progress.scoreMix[score] / answered) * 100)}
                >
                  <ProgressLabel>
                    <ScoreBadge score={score} /> {progress.scoreMix[score]} answers
                  </ProgressLabel>
                  <ProgressValue />
                </Progress>
              ))}
            </CardContent>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle skullet-own="">
            <h2>By session</h2>
          </CardTitle>
        </CardHeader>
        <ItemGroup>
          {progress.bySession.map(({ id, title, mastered, total }) => (
            // ItemGroup is a div with role="list" (see ui/item.tsx), so the row takes the matching role.
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
            <Item key={id} role="listitem">
              <ItemContent>
                <ItemTitle>
                  <Link href={`/s/${id}`}>{title}</Link>
                </ItemTitle>
                <ItemDescription>
                  {mastered} of {total} cards mastered
                </ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      </Card>
    </Container>
  );
}

/** Reads the clock outside render (cacheComponents and the compiler's purity rule), then the learner's rows. */
async function load(userId: string) {
  return getProgress(userId, new Date());
}
