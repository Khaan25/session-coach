import { CalendarCheckIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { Container } from "@/components/app/container";
import { AppPageHeader } from "@/components/app/page-header";
import { ProjectTabs } from "@/components/app/project-tabs";
import { AnswersChart } from "@/components/progress/answers-chart";
import { OwnershipMeter } from "@/components/progress/ownership-meter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Stat, StatDescription, StatGroup, StatLabel, StatValue } from "@/components/ui/stat";
import type { Ownership } from "@/lib/progress/ownership";
import {
  REVIEW_STEPS,
  stepLabels,
  type Progress as ProgressData,
  type ReviewStep,
} from "@/lib/progress/progress";

// /progress answers "am I making these decisions mine?": the summary line as the hero, today's task, the one chart,
// then By project and By session. Shared by the page, its skeleton and /canvas; everything comes in as props.

const DESCRIPTION = "How many of your decisions you can explain, and how many you own.";

/** What each step means, under its count. Reviews are on day 1, 4 and 11 (gaps of 1, 3 and 7 days). */
const stepMeans: Record<ReviewStep, string> = {
  new: "Made from a session. Not answered yet.",
  "day-1": "Answered once, or sent back by a miss.",
  "day-4": "Explained on day 1.",
  "day-11": "Explained on day 4.",
  mastered: "Explained again on day 11.",
};

/** Everything the page shows. */
export type ProgressPageData = {
  progress: ProgressData;
  ownership: Ownership;
  /** The review queue's count, the same number the dashboard and sidebar show. */
  dueToday: number;
  /** How many of today's cards are on their day 11 review, a pass from owned. */
  dueOnDay11: number;
  /** The project tab picked (`?repo=`); null for every project. */
  repo: string | null;
  /** The learner's projects, for the tabs; null when the read failed or isn't known yet. */
  repos: string[] | null;
};

/** The page's URL for one project, or for every project. */
export const progressHref = (repo: string | null) =>
  repo ? `/progress?${new URLSearchParams({ repo })}` : "/progress";

/** Progress with nothing to count yet: the header, then the empty state that says what to do. */
export function ProgressEmpty({ empty }: { empty: React.ReactNode }) {
  return (
    <Container>
      <AppPageHeader title="Progress" description={DESCRIPTION} />
      {empty}
    </Container>
  );
}

export function ProgressSummary({ data }: { data: ProgressPageData }) {
  const { progress, ownership, dueToday, dueOnDay11, repo, repos } = data;
  // The hero's numbers: the picked project's row, or every project's.
  const counts = repo
    ? (ownership.repos.find((row) => row.repo === repo) ?? { explained: 0, owned: 0, total: 0 })
    : ownership.overall;
  const body = (
    <>
      <section>
        <p className="type-stat-xl text-text-1">
          {`${counts.total} cards · ${counts.explained} explained · ${counts.owned} owned`}
        </p>
      </section>

      <TodayBanner dueToday={dueToday} dueOnDay11={dueOnDay11} allProjects={repo !== null} />

      <Card>
        <CardContent>
          <div className="flex flex-col gap-6">
            <StatGroup variant="plain">
              {REVIEW_STEPS.map((step) => (
                <Stat key={step}>
                  <StatLabel>{stepLabels[step]}</StatLabel>
                  <StatValue>{progress.steps[step]}</StatValue>
                  <StatDescription>{stepMeans[step]}</StatDescription>
                </Stat>
              ))}
            </StatGroup>
            <AnswersChart data={progress.answersPerDay} />
          </div>
        </CardContent>
      </Card>

      {ownership.repos.length > 0 && (
        <OwnershipMeter ownership={ownership} title="By project" path="/progress" />
      )}

      <Card>
        <CardHeader>
          <CardTitle skullet-own="">
            <h2>By session</h2>
          </CardTitle>
        </CardHeader>
        <ItemGroup aria-label="Cards by session">
          {progress.bySession.map(({ id, title, mastered, total }) => (
            // ItemGroup is a div with role="list" (see ui/item.tsx), so the row takes the matching role.
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
            <Item key={id} role="listitem">
              <ItemContent>
                <ItemTitle>
                  <Link href={`/s/${id}`}>{title}</Link>
                </ItemTitle>
                <ItemDescription>
                  {mastered} of {total} cards owned
                </ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      </Card>
    </>
  );
  return (
    <Container>
      {/* skullet-own: static text stays real in the skeleton. The spans set their own colour because skullet makes
          the colour they would inherit transparent. */}
      <AppPageHeader
        title={
          <span skullet-own="" className="text-text-1">
            Progress
          </span>
        }
        description={
          <span skullet-own="" className="text-text-2">
            {DESCRIPTION}
          </span>
        }
      />

      {repos && repos.length > 0 ? (
        <ProjectTabs
          tabs={[null, ...repos].map((name) => ({ repo: name, href: progressHref(name) }))}
          repo={repo}
        >
          {body}
        </ProjectTabs>
      ) : (
        body
      )}
    </Container>
  );
}

/** The one task for today: the review queue's count, and what one of its cards is a pass away from. */
function TodayBanner({
  dueToday,
  dueOnDay11,
  allProjects,
}: {
  dueToday: number;
  dueOnDay11: number;
  allProjects: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="flex items-center gap-2">
            <CalendarCheckIcon aria-hidden />
            {dueToday > 0 ? (
              <Link href="/review">
                {dueToday} {dueToday === 1 ? "card is" : "cards are"} due today
              </Link>
            ) : (
              "Nothing is due today"
            )}
          </h2>
        </CardTitle>
        <CardDescription>
          {/* The queue is one list for every project (at most 5 a day), so a project tab doesn't narrow it. */}
          {allProjects && "From all your projects. "}
          {dueToday === 0
            ? "Cards come back on day 1, 4 and 11 after you answer them. Come back tomorrow."
            : dueOnDay11 === 0
              ? "Write the why in your own words first. Each one you explain moves a step closer to owned."
              : dueToday === 1
                ? "It's on its day 11 review: explain it and you own it."
                : dueOnDay11 === 1
                  ? "One of them is on its day 11 review: explain it and you own it."
                  : `${dueOnDay11} of them are on their day 11 review: explain them and you own them.`}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
