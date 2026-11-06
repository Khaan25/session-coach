import {
  ArrowRightIcon,
  CalendarBlankIcon,
  CalendarCheckIcon,
  CardsIcon,
  SealCheckIcon,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import Link from "next/link";

import { Container } from "@/components/app/container";
import { AppPageHeader } from "@/components/app/page-header";
import { ProjectTabs } from "@/components/app/project-tabs";
import { AnswersChart } from "@/components/progress/answers-chart";
import { OwnershipMeter } from "@/components/progress/ownership-meter";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemLink,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import type { Ownership } from "@/lib/progress/ownership";
import {
  REVIEW_STEPS,
  stepLabels,
  type Progress as ProgressData,
  type ReviewStep,
} from "@/lib/progress/progress";

// /progress answers "am I making these decisions mine?": the summary line as the hero with today's task under it, then
// two pairs of framed lists side by side from lg: cards per review step beside the one chart, By project beside By
// session. Shared by the page, its skeleton and /canvas; everything comes in as props.

const DESCRIPTION = "How many of your decisions you can explain, and how many you own.";

/** Each step's icon and what it means, one short line under its name. Reviews are on day 1, 4 and 11. */
const stepMeta: Record<ReviewStep, { icon: Icon; means: string }> = {
  new: { icon: CardsIcon, means: "Not answered yet" },
  "day-1": { icon: CalendarBlankIcon, means: "Answered once, or missed" },
  "day-4": { icon: CalendarBlankIcon, means: "Explained on day 1" },
  "day-11": { icon: CalendarBlankIcon, means: "Explained on day 4" },
  mastered: { icon: SealCheckIcon, means: "Explained on day 11" },
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
      <section className="flex flex-col gap-4">
        {/* Each count keeps its word on the line, so a phone breaks between them, never inside one. */}
        <p className="type-stat text-text-1 sm:type-stat-lg">
          <span className="whitespace-nowrap">{`${counts.total} cards`}</span>
          {" · "}
          <span className="whitespace-nowrap">{`${counts.explained} explained`}</span>
          {" · "}
          <span className="whitespace-nowrap">{`${counts.owned} owned`}</span>
        </p>
        <TodayBanner dueToday={dueToday} dueOnDay11={dueOnDay11} allProjects={repo !== null} />
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle skullet-own="">
              <h2>
                Cards by step <Count n={progress.totalCards} />
              </h2>
            </CardTitle>
          </CardHeader>
          <ul aria-label="Cards by step">
            {REVIEW_STEPS.map((step) => {
              const { icon: StepIcon, means } = stepMeta[step];
              return (
                <Item key={step} render={<li />}>
                  <ItemMedia variant="icon">
                    <StepIcon aria-hidden />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{stepLabels[step]}</ItemTitle>
                    <ItemDescription>{means}</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <span className="data type-heading-sm text-text-1">{progress.steps[step]}</span>
                  </ItemActions>
                </Item>
              );
            })}
          </ul>
        </Card>

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
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {ownership.repos.length > 0 && (
          <OwnershipMeter
            ownership={ownership}
            title={
              <>
                By project <Count n={ownership.repos.length} />
              </>
            }
            path="/progress"
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle skullet-own="">
              {/* Today's "Sessions" link lands here. */}
              <h2 id="by-session">
                By session <Count n={progress.bySession.length} />
              </h2>
            </CardTitle>
          </CardHeader>
          {/* A plain list, not an ItemGroup: rows straight in the card share its frame and rules, no inset panel. */}
          <ul aria-label="Cards by session">
            {progress.bySession.map(({ id, title, mastered, total }) => (
              <Item key={id} render={<li />}>
                <ItemContent>
                  <ItemTitle>
                    <ItemLink render={<Link href={`/s/${id}`} />}>{title}</ItemLink>
                  </ItemTitle>
                </ItemContent>
                <ItemActions>
                  <span className="data type-body-sm whitespace-nowrap text-text-2">
                    {mastered} of {total} cards owned
                  </span>
                  <ArrowRightIcon aria-hidden className="text-text-3 rtl:-scale-x-100" />
                </ItemActions>
              </Item>
            ))}
          </ul>
        </Card>
      </div>
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
        // Off the sidebar since Today (DECISIONS, 2026-11-06).
        actions={
          <Link href="/defend" className={buttonVariants({ variant: "secondary" })}>
            Defend it
          </Link>
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

/** A section's count, muted, after its title on the same line. */
const Count = ({ n }: { n: number }) => <span className="data text-text-3">{n}</span>;

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
              <Link href="/review" className={buttonVariants({ variant: "link" })}>
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
