import type { Metadata } from "next";

import { Container } from "@/components/app/container";
import { AppPageHeader } from "@/components/app/page-header";
import { ScoreBadge, type Score } from "@/components/app/score-badge";
import { AnswersChart } from "@/components/progress/answers-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { PageHeaderStat, PageHeaderStats } from "@/components/ui/page-header";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Stat, StatGroup, StatLabel, StatValue } from "@/components/ui/stat";
import { stepLabels, type ReviewStep } from "@/lib/sample/cards";
import {
  sampleAnswersPerDay,
  sampleHeadline,
  sampleScoreMix,
  sampleSessionProgress,
  sampleSteps,
} from "@/lib/sample/progress";

export const metadata: Metadata = { title: "Progress" };

const steps = Object.keys(stepLabels) as ReviewStep[];
const scores: Score[] = [2, 1, 0];

// SAMPLE numbers until Phase 7. The empty state (NoReviewsEmpty) shows on /design-system#app.
// TODO(zia): compute these in src/lib/review/progress.ts (pure, tested) from answers and reviews.
export default function ProgressPage() {
  const answered = scores.reduce<number>((sum, score) => sum + sampleScoreMix[score], 0);
  return (
    <Container>
      <AppPageHeader
        title="Progress"
        description="Mastered cards, plus cards you explained in full in the last 7 days."
      >
        <PageHeaderStats>
          <PageHeaderStat
            label="Decisions you can still explain"
            value={sampleHeadline.canStillExplain}
            detail={`of ${sampleHeadline.totalCards} cards`}
          />
          <PageHeaderStat label="Mastered" value={sampleSteps.mastered} />
        </PageHeaderStats>
      </AppPageHeader>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Cards by step</h2>
          </CardTitle>
        </CardHeader>
        <StatGroup variant="plain">
          {steps.map((step) => (
            <Stat key={step}>
              <StatLabel>{stepLabels[step]}</StatLabel>
              <StatValue>{sampleSteps[step]}</StatValue>
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
            <AnswersChart data={sampleAnswersPerDay} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Score mix</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scores.map((score) => (
              <Progress key={score} value={Math.round((sampleScoreMix[score] / answered) * 100)}>
                <ProgressLabel>
                  <ScoreBadge score={score} /> {sampleScoreMix[score]} answers
                </ProgressLabel>
                <ProgressValue />
              </Progress>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>By session</h2>
          </CardTitle>
        </CardHeader>
        <ItemGroup>
          {sampleSessionProgress.map(({ id, title, mastered, total }) => (
            // ItemGroup is a div with role="list" (see ui/item.tsx), so the row takes the matching role.
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
            <Item key={id} role="listitem">
              <ItemContent>
                <ItemTitle>{title}</ItemTitle>
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
