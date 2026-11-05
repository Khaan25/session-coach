import { CalendarCheckIcon, SealCheckIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/app/container";
import { MeasuredSuspense } from "@/components/app/measured-suspense";
import { NoCardsYetEmpty, NoReviewsEmpty } from "@/components/app/empty-state";
import { AppPageHeader } from "@/components/app/page-header";
import { ScoreBadge, type Score } from "@/components/app/score-badge";
import { AnswersChart } from "@/components/progress/answers-chart";
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
import { PageHeaderStat, PageHeaderStats } from "@/components/ui/page-header";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Stat, StatDescription, StatGroup, StatLabel, StatValue } from "@/components/ui/stat";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { CardPath } from "@/lib/progress/card-path";
import type { OwnershipCount } from "@/lib/progress/ownership";
import {
  CHART_DAYS,
  REVIEW_STEPS,
  stepLabels,
  type Progress as ProgressData,
  type ReviewStep,
} from "@/lib/progress/progress";
import { getCardPath, getOwnership, getProgress } from "@/lib/progress/queries";
import { dueTodayCount } from "@/lib/review/queries";
import { cardlessReason } from "@/lib/sessions/queries";

export const metadata: Metadata = { title: "Progress" };

const scores: Score[] = [2, 1, 0];
const description = "What to do today, and how a card becomes yours.";

/** What each step means, under its count. Reviews are on day 1, 4 and 11 (gaps of 1, 3 and 7 days). */
const stepMeans: Record<ReviewStep, string> = {
  new: "Made from a session. Not answered yet.",
  "day-1": "Answered once, or sent back by a miss.",
  "day-4": "Explained on day 1.",
  "day-11": "Explained on day 4.",
  mastered: "Explained again on day 11.",
};

/** Everything the page shows; the skeleton draws the same shape from `SAMPLE`. */
type ProgressPageData = {
  progress: ProgressData;
  ownership: OwnershipCount;
  dueToday: number;
  path: CardPath | null;
};

// Only the skeleton's shape comes from this: counts, days and session titles like a real learner's.
const SAMPLE: ProgressPageData = {
  progress: {
    canStillExplain: 5,
    totalCards: 9,
    steps: { new: 2, "day-1": 2, "day-4": 1, "day-11": 1, mastered: 3 },
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
  },
  ownership: { explained: 6, owned: 3, total: 9 },
  dueToday: 3,
  path: {
    decision: "Rate limit uploads per CLI token",
    session: "Add rate limiting to the upload route",
    stops: [
      { date: "Oct 23", what: "Made from your session", step: "New", outcome: "Waiting." },
      { date: "Oct 23", what: "First answer", score: 1, step: "Day 1", outcome: "Due Oct 24." },
      { date: "Oct 24", what: "Day 1 review", score: 2, step: "Day 4", outcome: "Due Oct 27." },
      { date: "Oct 27", what: "Day 4 review", score: 2, step: "Day 11", outcome: "Due today." },
    ],
    next: { date: "Today", what: "Day 11 review", outcome: "Explain it now.", dueToday: true },
  },
};

export default function ProgressPage() {
  // Skullet measures the real page, drawn from sample progress, so each card keeps its shape when the data lands. The
  // session count and the card's path aren't known until then, so those lists can still grow or shrink.
  return (
    <MeasuredSuspense label="Loading your progress" skeleton={<ProgressSummary data={SAMPLE} />}>
      <ProgressView />
    </MeasuredSuspense>
  );
}

// Reads the signed-in learner's rows, so it renders inside Suspense (cacheComponents). A failed read throws to
// error.tsx, which offers a retry.
async function ProgressView() {
  const user = await getCurrentUser();
  const data = user ? await load(user.id) : null;

  // No card: `cardlessReason` picks the copy (first run points at the CLI; a session being read, a failed one, or
  // sessions that gave none point at the sessions). Cards but no answer yet point at the queue.
  if (!user || !data) return <ProgressEmpty empty={<NoCardsYetEmpty />} />;
  const { progress } = data;
  if (progress.totalCards === 0) {
    return <ProgressEmpty empty={<NoCardsYetEmpty cardless={await cardlessReason(user.id)} />} />;
  }
  if (progress.steps.new === progress.totalCards && answeredCount(progress) === 0) {
    return <ProgressEmpty empty={<NoReviewsEmpty />} />;
  }
  return <ProgressSummary data={data} />;
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

const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0);

function ProgressSummary({ data }: { data: ProgressPageData }) {
  const { progress, ownership, dueToday, path } = data;
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
          <PageHeaderStat label="Owned" value={progress.steps.mastered} />
        </PageHeaderStats>
      </AppPageHeader>

      <TodayBanner dueToday={dueToday} />

      {path && <CardPathCard path={path} />}

      <Card>
        <CardContent>
          <Collapsible>
            <CollapsibleRow
              size="row"
              summary={`${ownership.total} cards · ${ownership.explained} explained · ${ownership.owned} owned`}
            >
              All your cards
            </CollapsibleRow>
            <CollapsibleContent>
              <div className="flex flex-col gap-6 pt-4">
                <section aria-labelledby="progress-steps" className="flex flex-col gap-3">
                  <h2 id="progress-steps" className="type-heading-xs text-text-1">
                    Cards by step
                  </h2>
                  <StatGroup variant="plain">
                    {REVIEW_STEPS.map((step) => (
                      <Stat key={step}>
                        <StatLabel>{stepLabels[step]}</StatLabel>
                        <StatValue>{progress.steps[step]}</StatValue>
                        <StatDescription>{stepMeans[step]}</StatDescription>
                      </Stat>
                    ))}
                  </StatGroup>
                </section>

                <section aria-labelledby="progress-owned" className="flex flex-col gap-3">
                  <h2 id="progress-owned" className="type-heading-xs text-text-1">
                    Explained and owned
                  </h2>
                  <div className="flex flex-col gap-1">
                    <Progress value={pct(ownership.explained, ownership.total)}>
                      <ProgressLabel>
                        Explained: {ownership.explained} of {ownership.total}
                      </ProgressLabel>
                      <ProgressValue />
                    </Progress>
                    <p className="type-body-sm text-text-2">
                      You explained it in your own words and the grader scored it Explained, at
                      least once.
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Progress value={pct(ownership.owned, ownership.total)}>
                      <ProgressLabel>
                        Owned: {ownership.owned} of {ownership.total}
                      </ProgressLabel>
                      <ProgressValue />
                    </Progress>
                    <p className="type-body-sm text-text-2">
                      You still explained it on day 11, after three spaced reviews. That is the goal
                      for every card.
                    </p>
                  </div>
                </section>

                <section aria-labelledby="progress-answers" className="flex flex-col gap-3">
                  <h2 id="progress-answers" className="type-heading-xs text-text-1">
                    Answers per day
                  </h2>
                  <AnswersChart data={progress.answersPerDay} />
                </section>

                <section aria-labelledby="progress-mix" className="flex flex-col gap-3">
                  <h2 id="progress-mix" className="type-heading-xs text-text-1">
                    Score mix
                  </h2>
                  <p className="type-body-sm text-text-2">
                    {answered > 0
                      ? `${answered} answers in the last ${progress.answersPerDay.length} days.`
                      : `No answers in the last ${progress.answersPerDay.length} days.`}
                  </p>
                  {answered > 0 &&
                    scores.map((score) => (
                      <Progress key={score} value={pct(progress.scoreMix[score], answered)}>
                        <ProgressLabel>
                          <ScoreBadge score={score} /> {progress.scoreMix[score]} answers
                        </ProgressLabel>
                        <ProgressValue />
                      </Progress>
                    ))}
                </section>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

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
                  {mastered} of {total} cards owned
                </ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      </Card>
    </Container>
  );
}

/** The one task for today: the review queue's count (the same number the dashboard and sidebar show). */
function TodayBanner({ dueToday }: { dueToday: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="flex items-center gap-2">
            <CalendarCheckIcon aria-hidden />
            {dueToday > 0
              ? `${dueToday} ${dueToday === 1 ? "card" : "cards"} to review today`
              : "Nothing to review today"}
          </h2>
        </CardTitle>
        <CardDescription>
          {dueToday > 0
            ? "Write the why in your own words first. Each one you explain moves a step closer to owned."
            : "Cards come back on day 1, 4 and 11 after you answer them. Come back tomorrow."}
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
              <ItemContent>
                <ItemTitle>
                  {stop.date} · {stop.what} <Badge variant="outline">{stop.step}</Badge>{" "}
                  {stop.score !== undefined && <ScoreBadge score={stop.score} />}
                </ItemTitle>
                <ItemDescription>{stop.outcome}</ItemDescription>
              </ItemContent>
            </Item>
          </li>
        ))}
        {path.next ? (
          <li>
            <Item selected={path.next.dueToday}>
              <ItemMedia variant="icon">
                <CalendarCheckIcon aria-hidden />
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
          </li>
        ) : (
          <li>
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
          </li>
        )}
      </ol>
    </Card>
  );
}

/** Reads the clock outside render (cacheComponents and the compiler's purity rule), then the learner's rows. */
async function load(userId: string): Promise<ProgressPageData> {
  const now = new Date();
  const [progress, ownership, dueToday, path] = await Promise.all([
    getProgress(userId, now),
    getOwnership(),
    dueTodayCount(userId, now),
    getCardPath(userId, now),
  ]);
  return { progress, ownership: ownership.overall, dueToday, path };
}
