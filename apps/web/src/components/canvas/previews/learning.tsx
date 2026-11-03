"use client";

// The daily loop as full pages in the app shell: dashboard, a session's cards, the review queue and the answer-first
// quiz. The real QuizForm posts to the grading route, so its look is rebuilt here with the Friday changes.

import { FireIcon, LockSimpleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

import { Container } from "@/components/app/container";
import {
  AllCaughtUpEmpty,
  EmptyState,
  NoCardsYetEmpty,
  NoSessionsEmpty,
} from "@/components/app/empty-state";
import {
  ErrorState,
  LoadFailedState,
  OfflineState,
  SessionFailedState,
} from "@/components/app/error-state";
import { ProcessingState, SessionListLoading } from "@/components/app/loading-state";
import { AppPageHeader } from "@/components/app/page-header";
import { ScoreBadge } from "@/components/app/score-badge";
import { SessionRow } from "@/components/app/session-row";
import { StatusBadge } from "@/components/app/status-badge";
import { Sprite } from "@/components/art/sprite";
import { DecisionCard } from "@/components/cards/decision-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Code } from "@/components/ui/code-block";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemLink,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { PageHeaderStat, PageHeaderStats } from "@/components/ui/page-header";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { CardView } from "@/lib/cards/columns";

import { AppFrame, FRAME_SESSIONS } from "./frames";
import { IdeaNote, NOW } from "./parts";

const SESSION = FRAME_SESSIONS[0];
const SESSION_PATH = `/s/${SESSION.id}`;

const ROWS = FRAME_SESSIONS.map((s, i) => ({
  ...s,
  branch: null,
  error: s.status === "failed" ? "The log was empty after redaction." : null,
  created_at: new Date(NOW.getTime() - (i * 9 + 2) * 3_600_000).toISOString(),
  cardCount: s.status === "ready" ? 4 : undefined,
}));

const REPOS = [
  { repo: "session-coach", owned: 12, total: 30 },
  { repo: "rapporteur", owned: 5, total: 9 },
];

/** Seven days, newest last. A missed day is grey but never resets the count. */
const WEEK = [true, true, false, true, true, true, false];

const DASHBOARD_DESCRIPTION = "Explain back the decisions your coding agent made.";

export function DashboardPreview({
  state,
}: {
  state: "loading" | "empty" | "full" | "error" | "offline";
}) {
  const retry = <Button variant="secondary">Try again</Button>;
  return (
    <AppFrame
      path="/dashboard"
      sessions={state === "empty" ? [] : undefined}
      dueCount={state === "full" ? 3 : 0}
    >
      <Container>
        <AppPageHeader title="Dashboard" description={DASHBOARD_DESCRIPTION}>
          {state === "full" && (
            <PageHeaderStats>
              <PageHeaderStat label="Decisions you own" value={17} detail="of 39" />
              <PageHeaderStat label="Practised" value={5} detail="of the last 7 days" />
              <PageHeaderStat label="Due today" value={3} detail="of 5 a day" />
            </PageHeaderStats>
          )}
        </AppPageHeader>
        {state === "loading" && (
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Sessions</h2>
              </CardTitle>
            </CardHeader>
            <SessionListLoading rows={4} />
          </Card>
        )}
        {state === "empty" && <NoSessionsEmpty />}
        {state === "error" && (
          <LoadFailedState noun="your sessions" code="ERR-7F3A" action={retry} />
        )}
        {state === "offline" && <OfflineState noun="your sessions" action={retry} />}
        {state === "full" && (
          <>
            <Item variant="outline">
              <ItemMedia className="hidden sm:flex">
                <Sprite name="cards" className="w-14" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>3 cards are due today</ItemTitle>
                <ItemDescription>
                  Explain each one back to move it to its next review.
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Link href="/review" className={buttonVariants()}>
                  Start review
                </Link>
              </ItemActions>
            </Item>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>
                    <h2>You own 17 of 39 decisions</h2>
                  </CardTitle>
                  <CardDescription>
                    Up 2 this week. Owned means you explained it right on day 7.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    {REPOS.map(({ repo, owned, total }) => (
                      <Progress key={repo} value={Math.round((owned / total) * 100)}>
                        <ProgressLabel>{repo}</ProgressLabel>
                        <ProgressValue>{() => `${owned} of ${total}`}</ProgressValue>
                      </Progress>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>
                    <h2 className="flex items-center gap-2">
                      <FireIcon aria-hidden="true" />5 of the last 7 days
                    </h2>
                  </CardTitle>
                  <CardDescription>
                    A missed day costs nothing. Answer one card today to make it 6.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2" aria-label="Last 7 days: 5 practised">
                    {WEEK.map((done, i) => (
                      <span
                        key={i}
                        className={`size-4 rounded-full ${done ? "bg-accent-line" : "bg-cell-quiet"}`}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>Sessions</h2>
                </CardTitle>
              </CardHeader>
              <ItemGroup>
                {ROWS.map((s) => (
                  <SessionRow key={s.id} session={s} cardCount={s.cardCount} now={NOW} />
                ))}
              </ItemGroup>
            </Card>
            <IdeaNote>
              Meter: reviews.mastered grouped by sessions.repo, no new table. Streak counts days
              with an answer in the last 7, so one missed day costs nothing.
            </IdeaNote>
          </>
        )}
      </Container>
    </AppFrame>
  );
}

const sample = (position: number, decision: string, why: string, question: string): CardView => ({
  id: `card-${position}`,
  position,
  decision,
  why,
  source: "stated",
  evidence: [
    {
      event_index: position + 4,
      quote: "Keyed on the token, so one learner on a shared IP doesn't block the others.",
      file: "apps/web/src/app/api/sessions/route.ts",
      lines: [12, 30],
      verified: true,
    },
  ],
  files: ["apps/web/src/app/api/sessions/route.ts"],
  question,
  flagged: false,
});

const CARDS = [
  sample(
    0,
    "Rate limit the upload route per token, not per IP",
    "Learners behind one office IP would block each other; the token names the learner.",
    "Why is the limit keyed on the token rather than the IP?",
  ),
  sample(
    1,
    "Return 429 with a Retry-After header",
    "The CLI already backs off on Retry-After, so no client change was needed.",
    "Why does the route send Retry-After instead of only a 429?",
  ),
];

/** DecisionCard as it would be before an answer: the server leaves `why` out, so the slot says why it's empty. */
function LockedDecisionCard({ card }: { card: CardView }) {
  return (
    <Card size="lg">
      <CardHeader>
        <CardTitle>
          <h2>{card.decision}</h2>
        </CardTitle>
        <CardAction>
          <Badge variant="outline">New</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <DataList>
          <DataListItem>
            <DataListLabel>Why</DataListLabel>
            <DataListValue>
              <span className="flex items-center gap-2 text-text-3">
                <LockSimpleIcon aria-hidden="true" />
                Explain it first. The why shows after you answer.
              </span>
            </DataListValue>
          </DataListItem>
          <DataListItem>
            <DataListLabel>Files</DataListLabel>
            <DataListValue>
              <span className="flex flex-wrap gap-2">
                {card.files.map((file) => (
                  <Code key={file}>{file}</Code>
                ))}
              </span>
            </DataListValue>
          </DataListItem>
        </DataList>
      </CardContent>
      <CardFooter>
        <div className="flex w-full flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 type-body">{card.question}</p>
          <Button variant="secondary" size="sm">
            Explain it
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export function SessionPreview({
  state,
}: {
  state: "processing" | "ready" | "failed" | "no-cards";
}) {
  const status = state === "no-cards" ? "ready" : state;
  return (
    <AppFrame
      path={SESSION_PATH}
      sessions={FRAME_SESSIONS.map((s) => (s.id === SESSION.id ? { ...s, status } : s))}
    >
      <Container>
        <AppPageHeader
          title={SESSION.title}
          description={
            <span className="flex flex-wrap items-center gap-2">
              <Code>{SESSION.repo}</Code>
              <Code>zia/rate-limit</Code>
              <StatusBadge status={status} />
            </span>
          }
        >
          <PageHeaderStats>
            <PageHeaderStat label="Duration" value={42} detail="min" />
            <PageHeaderStat label="Started" value="3 hours ago" />
            {state === "ready" && <PageHeaderStat label="Cards" value={CARDS.length} />}
            {state === "no-cards" && <PageHeaderStat label="Cards" value={0} />}
          </PageHeaderStats>
        </AppPageHeader>
        {state === "processing" && <ProcessingState status="processing" />}
        {state === "failed" && <SessionFailedState error="The log was empty after redaction." />}
        {state === "no-cards" && (
          <EmptyState
            title="No cards to show"
            description="This session has no cards available to review. Sessions where you talk through options give the most cards."
          />
        )}
        {state === "ready" && (
          <div className="flex flex-col gap-6">
            <DecisionCard card={CARDS[0]} />
            <LockedDecisionCard card={CARDS[1]} />
            <IdeaNote>
              The server sends `why` only for cards the learner has answered. Unanswered cards never
              carry it, so it can&rsquo;t be read from the page source or the network tab.
            </IdeaNote>
          </div>
        )}
      </Container>
    </AppFrame>
  );
}

const QUEUE = [
  { id: "c1", decision: CARDS[0].decision, sessionName: SESSION.title, step: "Day 1" },
  { id: "c2", decision: CARDS[1].decision, sessionName: SESSION.title, step: "New" },
  {
    id: "c3",
    decision: "Skip unknown JSONL line types instead of throwing",
    sessionName: "Write transcriptParser.ts",
    step: "Day 3",
  },
];

const REVIEW_DESCRIPTION =
  "Explain each decision back in your own words. Each card comes back on day 1, 3 and 7.";

/** /review with cards due: the queue, capped at 5 a day, and Start review. */
export function ReviewQueuePreview() {
  return (
    <AppFrame path="/review">
      <Container>
        <AppPageHeader title="Review" description={REVIEW_DESCRIPTION} />
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Due today</h2>
            </CardTitle>
            <CardDescription>
              3 of today&rsquo;s 5. Cards due today, then new cards from the last 7 days.
            </CardDescription>
            <CardAction>
              <Link href="/review" className={buttonVariants()}>
                Start review
              </Link>
            </CardAction>
          </CardHeader>
          <ItemGroup>
            {QUEUE.map((card) => (
              // ItemGroup is a div with role="list", so the row takes the matching role.
              // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
              <Item key={card.id} role="listitem">
                <ItemContent>
                  <ItemTitle>
                    <ItemLink href={`/review/${card.id}`}>{card.decision}</ItemLink>
                  </ItemTitle>
                  <ItemDescription>{card.sessionName}</ItemDescription>
                </ItemContent>
                <Badge>{card.step}</Badge>
              </Item>
            ))}
          </ItemGroup>
        </Card>
        <IdeaNote>
          Daily cap of 5: once today&rsquo;s 5 are done, the rest wait. Overdue cards never pile up.
        </IdeaNote>
      </Container>
    </AppFrame>
  );
}

const CARD = CARDS[1];
const CARD_PATH = "/review/c2";

/** The quiz page's header: the decision, and the session it came from. */
function QuizHeader() {
  return (
    <AppPageHeader
      title={CARD.decision}
      description={
        <>
          From{" "}
          <Link href={SESSION_PATH} className={buttonVariants({ variant: "link" })}>
            {SESSION.title}
          </Link>
        </>
      }
      actions={<Badge variant="outline">Card 2 of 5 today</Badge>}
    />
  );
}

/** The answer-first quiz. Interactive: type, submit, or tap "I don't know yet". Nothing is sent anywhere. */
export function ReviewAnswerPreview() {
  const [answer, setAnswer] = useState("");
  return (
    <AppFrame path={CARD_PATH}>
      <Container>
        <QuizHeader />
        <Card size="lg">
          <CardHeader>
            <CardTitle>
              <h2>{CARD.question}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel htmlFor="canvas-review-answer">Your explanation</FieldLabel>
              <Textarea
                id="canvas-review-answer"
                rows={5}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
              <FieldDescription>
                In your own words. Submit with{" "}
                <KbdGroup>
                  <Kbd>Cmd</Kbd>
                  <Kbd>Enter</Kbd>
                </KbdGroup>
                . Asking an AI to help you understand is fine here.
              </FieldDescription>
            </Field>
          </CardContent>
          <CardFooter>
            <div className="flex gap-2">
              <Button disabled={!answer.trim()}>Submit answer</Button>
              <Button variant="secondary">I don&rsquo;t know yet</Button>
            </div>
          </CardFooter>
        </Card>
        <IdeaNote>
          The page has only the decision and the question. The why and the model answer come back
          from POST /api/review/answer after submit, never hidden in the HTML.
        </IdeaNote>
      </Container>
    </AppFrame>
  );
}

export function ReviewStatePreview({
  state,
}: {
  state: "loading" | "grading" | "result" | "dont-know" | "caught-up" | "failed" | "no-cards";
}) {
  const onQueue = state === "caught-up" || state === "loading" || state === "no-cards";
  return (
    <AppFrame
      path={onQueue ? "/review" : CARD_PATH}
      dueCount={onQueue && state !== "loading" ? 0 : 3}
    >
      <Container>
        {onQueue ? (
          <AppPageHeader title="Review" description={REVIEW_DESCRIPTION} />
        ) : (
          <QuizHeader />
        )}
        {state === "loading" && (
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Due today</h2>
              </CardTitle>
              <CardDescription>
                Cards due today, then new cards from the last 7 days.
              </CardDescription>
            </CardHeader>
            <SessionListLoading rows={3} />
          </Card>
        )}
        {state === "no-cards" && <NoCardsYetEmpty />}
        {state === "caught-up" && (
          <>
            <AllCaughtUpEmpty next="tomorrow" />
            <IdeaNote>
              Daily cap of 5: once today&rsquo;s 5 are done, the rest wait. Overdue cards never pile
              up.
            </IdeaNote>
          </>
        )}
        {state === "grading" && (
          <Card size="lg">
            <CardHeader>
              <CardTitle>
                <h2>{CARD.question}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Field>
                <FieldLabel htmlFor="canvas-review-grading">Your explanation</FieldLabel>
                <Textarea
                  id="canvas-review-grading"
                  rows={5}
                  readOnly
                  defaultValue="The CLI retries on its own, so the header tells it when."
                />
                <FieldDescription>
                  Checking it against what was actually decided in the session. Usually 3 to 8
                  seconds.
                </FieldDescription>
              </Field>
            </CardContent>
            <CardFooter>
              <Button disabled>
                <Spinner />
                Scoring
              </Button>
            </CardFooter>
          </Card>
        )}
        {state === "failed" && (
          <ErrorState
            title="Your answer couldn't be scored"
            message="The grader didn't answer in time. Your answer is kept; try again in a minute."
            action={<Button>Try again</Button>}
          />
        )}
        {(state === "result" || state === "dont-know") && (
          <Card size="lg">
            <CardHeader>
              <CardTitle>
                <h2>{state === "result" ? "Your result" : "Here's the why"}</h2>
              </CardTitle>
              <CardDescription>
                {state === "result"
                  ? "Partly right. It comes back tomorrow."
                  : "No score, no streak lost. This card comes back tomorrow."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataList>
                {state === "result" && (
                  <>
                    <DataListItem>
                      <DataListLabel>Score</DataListLabel>
                      <DataListValue>
                        <ScoreBadge score={1} />
                      </DataListValue>
                    </DataListItem>
                    <DataListItem>
                      <DataListLabel>Your answer</DataListLabel>
                      <DataListValue>
                        The CLI retries on its own, so the header tells it when.
                      </DataListValue>
                    </DataListItem>
                    <DataListItem>
                      <DataListLabel>What was missing</DataListLabel>
                      <DataListValue>
                        That the CLI already backed off on Retry-After, so no client change was
                        needed.
                      </DataListValue>
                    </DataListItem>
                  </>
                )}
                <DataListItem>
                  <DataListLabel>Why</DataListLabel>
                  <DataListValue>{CARD.why}</DataListValue>
                </DataListItem>
                <DataListItem>
                  <DataListLabel>Evidence</DataListLabel>
                  <DataListValue>&ldquo;{CARD.evidence[0].quote}&rdquo;</DataListValue>
                </DataListItem>
                <DataListItem>
                  <DataListLabel>Next review</DataListLabel>
                  <DataListValue>Tomorrow</DataListValue>
                </DataListItem>
              </DataList>
            </CardContent>
            <CardFooter>
              <div className="flex flex-wrap gap-3">
                <Button>Next card</Button>
                <Button variant="secondary">Back to the queue</Button>
              </div>
            </CardFooter>
          </Card>
        )}
      </Container>
    </AppFrame>
  );
}
