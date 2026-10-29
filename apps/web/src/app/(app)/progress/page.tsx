import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Container } from "@/components/app/container";
import { NoReviewsEmpty } from "@/components/app/empty-state";
import { StatRowLoading } from "@/components/app/loading-state";
import { AppPageHeader } from "@/components/app/page-header";
import { ScoreBadge, type Score } from "@/components/app/score-badge";
import { AnswersChart } from "@/components/progress/answers-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { PageHeaderStat, PageHeaderStats } from "@/components/ui/page-header";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Stat, StatGroup, StatLabel, StatValue } from "@/components/ui/stat";
import { getCurrentUser } from "@/lib/auth/current-user";
import { REVIEW_STEPS, stepLabels } from "@/lib/progress/progress";
import { getProgress } from "@/lib/progress/queries";

export const metadata: Metadata = { title: "Progress" };

const scores: Score[] = [2, 1, 0];
const description = "Mastered cards, plus cards you explained in full in the last 7 days.";

export default function ProgressPage() {
  return (
    <Suspense
      fallback={
        <Container>
          <AppPageHeader title="Progress" description={description} />
          <StatRowLoading />
        </Container>
      }
    >
      <ProgressView />
    </Suspense>
  );
}

// Reads the signed-in learner's rows, so it renders inside Suspense (cacheComponents). A failed read throws to
// error.tsx, which offers a retry.
async function ProgressView() {
  const user = await getCurrentUser();
  const progress = user ? await load(user.id) : null;
  const answered = progress
    ? scores.reduce<number>((sum, score) => sum + progress.scoreMix[score], 0)
    : 0;

  if (
    !progress ||
    progress.totalCards === 0 ||
    (progress.steps.new === progress.totalCards && answered === 0)
  ) {
    return (
      <Container>
        <AppPageHeader title="Progress" description={description} />
        <NoReviewsEmpty />
      </Container>
    );
  }

  return (
    <Container>
      <AppPageHeader title="Progress" description={description}>
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
          <CardTitle>
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
            <CardTitle>
              <h2>Answers per day</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnswersChart data={progress.answersPerDay} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
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
          <CardTitle>
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
