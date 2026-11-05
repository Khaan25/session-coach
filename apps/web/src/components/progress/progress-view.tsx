import { CalendarCheckIcon, SealCheckIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { Container } from "@/components/app/container";
import { AppPageHeader } from "@/components/app/page-header";
import { ProjectTabs } from "@/components/app/project-tabs";
import { ScoreBadge } from "@/components/app/score-badge";
import { AnswersChart } from "@/components/progress/answers-chart";
import { ExplainedOwnedBars } from "@/components/progress/explained-owned-bars";
import { OwnershipMeter } from "@/components/progress/ownership-meter";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleRow } from "@/components/ui/collapsible";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Stat, StatDescription, StatGroup, StatLabel, StatValue } from "@/components/ui/stat";
import type { CardPath } from "@/lib/progress/card-path";
import type { Ownership } from "@/lib/progress/ownership";
import {
  REVIEW_STEPS,
  stepLabels,
  type Progress as ProgressData,
  type ReviewStep,
} from "@/lib/progress/progress";

// /progress as option C draws it (canvas: "Progress · C · Follow one card"): one task up top, then the schedule taught
// by one of the learner's cards, the numbers folded away. #79's project tabs and By project sit in the same column.
// Shared by the page, its skeleton and /canvas; everything comes in as props.

const DESCRIPTION = "One thing to do today, and why it matters.";

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
  path: CardPath | null;
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
  const { progress, ownership, dueToday, dueOnDay11, path, repo, repos } = data;
  // The folded numbers: the picked project's row, or every project's.
  const counts = repo
    ? (ownership.repos.find((row) => row.repo === repo) ?? { explained: 0, owned: 0, total: 0 })
    : ownership.overall;
  const body = (
    <>
      <TodayBanner dueToday={dueToday} dueOnDay11={dueOnDay11} allProjects={repo !== null} />

      {path && <CardPathCard path={path} />}

      <Card>
        <CardContent>
          <Collapsible>
            <CollapsibleRow
              size="row"
              summary={`${counts.total} cards · ${counts.explained} explained · ${counts.owned} owned`}
            >
              {repo ? `Your cards in ${repo}` : "All your cards"}
            </CollapsibleRow>
            <CollapsibleContent>
              <div className="flex flex-col gap-6 pt-4">
                <StatGroup variant="plain">
                  {REVIEW_STEPS.map((step) => (
                    <Stat key={step}>
                      <StatLabel>{stepLabels[step]}</StatLabel>
                      <StatValue>{progress.steps[step]}</StatValue>
                      <StatDescription>{stepMeans[step]}</StatDescription>
                    </Stat>
                  ))}
                </StatGroup>
                <ExplainedOwnedBars counts={counts} />
                <AnswersChart data={progress.answersPerDay} />
              </div>
            </CollapsibleContent>
          </Collapsible>
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
            {dueToday > 0
              ? `${dueToday} ${dueToday === 1 ? "card is" : "cards are"} due today`
              : "Nothing is due today"}
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
        {dueToday > 0 && (
          <CardAction>
            <Link href="/review" className={buttonVariants({ variant: "default" })}>
              Start review
            </Link>
          </CardAction>
        )}
      </CardHeader>
    </Card>
  );
}

/** The schedule taught by one of the learner's own cards: its real dates and scores, then its next review. */
function CardPathCard({ path }: { path: CardPath }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle skullet-own="">
          <h2>How a card becomes yours</h2>
        </CardTitle>
        <CardDescription>
          Follow one of your cards: &ldquo;{path.decision}&rdquo;, from &ldquo;{path.session}
          &rdquo;. Each time, you wrote the why first and only then saw the model answer.
        </CardDescription>
      </CardHeader>
      <ol aria-label="One card's reviews">
        {path.stops.map((stop, i) => (
          <li key={i}>
            <Item>
              <ItemMedia variant="icon">
                <Badge variant="outline">{stop.step}</Badge>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>
                  {stop.date} · {stop.what}{" "}
                  {stop.score !== undefined && <ScoreBadge score={stop.score} />}
                </ItemTitle>
                <ItemDescription>{stop.outcome}</ItemDescription>
              </ItemContent>
            </Item>
          </li>
        ))}
        <li>
          {path.next ? (
            <Item selected={path.next.dueToday}>
              <ItemMedia variant="icon">
                {path.next.dueToday ? (
                  <SealCheckIcon aria-hidden />
                ) : (
                  <CalendarCheckIcon aria-hidden />
                )}
              </ItemMedia>
              <ItemContent>
                <ItemTitle>
                  {path.next.date} · {path.next.what}
                </ItemTitle>
                <ItemDescription>{path.next.outcome}</ItemDescription>
              </ItemContent>
              {path.next.dueToday && (
                <ItemActions>
                  <Link
                    href="/review"
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                  >
                    Review it
                  </Link>
                </ItemActions>
              )}
            </Item>
          ) : (
            <Item>
              <ItemMedia variant="icon">
                <SealCheckIcon aria-hidden />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Owned</ItemTitle>
                <ItemDescription>
                  Three spaced reviews explained. This decision is yours.
                </ItemDescription>
              </ItemContent>
            </Item>
          )}
        </li>
      </ol>
    </Card>
  );
}
