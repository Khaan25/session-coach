"use client";

// Redesign options for /s/[id], one session's page, in each of its four states: processing, ready with decision cards,
// failed, and ready with no decisions found. Three layout ideas, each teaching on the page itself:
//   A, guided checklist: the session's steps as a checklist at the top, every state a step in it.
//   B, explain as you go: the page on the left, a guide rail on the right whose numbered notes match marks on the page.
//   C, focused single task: one thing to do, centred, with the rest one click away.
// Synthetic data only. The why of a card shows only on a card the learner has answered, as on the real page.

import {
  ArrowRightIcon,
  CheckIcon,
  LockSimpleIcon,
  QuotesIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

import { Container } from "@/components/app/container";
import { EmptyState } from "@/components/app/empty-state";
import { SessionFailedState } from "@/components/app/error-state";
import { ProcessingState } from "@/components/app/processing-state";
import { AppPageHeader } from "@/components/app/page-header";
import { ScoreBadge } from "@/components/app/score-badge";
import { StatusBadge } from "@/components/app/status-badge";
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
import { Collapsible, CollapsibleContent, CollapsibleRow } from "@/components/ui/collapsible";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { PageHeaderStat, PageHeaderStats } from "@/components/ui/page-header";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Status, type StatusValue } from "@/components/ui/status";
import { Textarea } from "@/components/ui/textarea";

import { AppFrame, FRAME_SESSIONS } from "../frames";
import { IdeaNote, Terminal } from "../parts";

type SessionState = "processing" | "ready" | "failed" | "no-cards";

const SESSION = FRAME_SESSIONS[0];
const PATH = `/s/${SESSION.id}`;
const FAILED_ERROR =
  "Making cards from this session didn't finish. Run session-coach push again to retry.";
/** What `push --latest` prints, from packages/cli/src/cli.ts and push.ts. The file name is synthetic. */
const RETRY_LINES = [
  "$ npx session-coach push --latest",
  "Pushing 7f3a2c91-4b6e-4d21-9a0f-3c5e8b1d2a47.jsonl (412 KB)",
  "Uploaded. Cards will appear in the app.",
  "Session id: 7f3a2c91",
];

type DemoCard = {
  id: string;
  decision: string;
  question: string;
  files: string[];
  /** Only the answered card carries these, as the server sends them only after an answer. */
  answered?: { why: string; quote: string; event: number };
};

const CARDS: DemoCard[] = [
  {
    id: "c1",
    decision: "Rate limit the upload route per token, not per IP",
    question: "Why is the limit keyed on the token rather than the IP?",
    files: ["apps/web/src/app/api/sessions/route.ts"],
    answered: {
      why: "Learners behind one office IP would block each other; the token names the learner.",
      quote: "Keyed on the token, so one learner on a shared IP doesn't block the others.",
      event: 14,
    },
  },
  {
    id: "c2",
    decision: "Return 429 with a Retry-After header",
    question: "Why does the route send Retry-After instead of only a 429?",
    files: ["apps/web/src/lib/http/responses.ts"],
  },
  {
    id: "c3",
    decision: "Count pushes in Postgres, not in memory",
    question: "Why does the counter live in the database rather than in the route?",
    files: ["supabase/migrations/20261102000100_rate_limit.sql"],
  },
];

/** The review path from README.md: an answer today, then days 1, 4 and 11, then owned. */
const STEPS = ["Today", "Day 1", "Day 4", "Day 11", "Owned"] as const;

/** The real page's frame and header, so every option differs only below it. */
function SessionPage({
  state,
  actions,
  children,
}: {
  state: SessionState;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const status = state === "no-cards" ? "ready" : state;
  return (
    <AppFrame
      path={PATH}
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
          actions={actions}
        >
          <PageHeaderStats>
            <PageHeaderStat label="Duration" value={42} detail="min" />
            <PageHeaderStat label="Started" value="3 hours ago" />
            {state === "ready" && <PageHeaderStat label="Cards" value={CARDS.length} />}
            {state === "no-cards" && <PageHeaderStat label="Cards" value={0} />}
          </PageHeaderStats>
        </AppPageHeader>
        {children}
      </Container>
    </AppFrame>
  );
}

/** Where a card stands on its review path, each step a word, the current one filled. */
function ScheduleStrip({ at, label }: { at: number; label: string }) {
  return (
    <ol aria-label={label} className="flex flex-wrap items-center gap-2">
      {STEPS.map((step, i) => (
        <li key={step} className="flex items-center gap-2">
          <Badge
            variant={i === at ? "default" : i < at ? "success" : "outline"}
            aria-current={i === at ? "step" : undefined}
          >
            {i < at && <CheckIcon aria-hidden="true" />}
            {step}
          </Badge>
          {i < STEPS.length - 1 && <ArrowRightIcon aria-hidden="true" className="text-text-3" />}
        </li>
      ))}
    </ol>
  );
}

/** The why, the source and the quote of an answered card, as the grading route returns them. */
function Revealed({ card }: { card: DemoCard }) {
  if (!card.answered) return null;
  return (
    <DataList>
      <DataListItem>
        <DataListLabel>Why</DataListLabel>
        <DataListValue>{card.answered.why}</DataListValue>
      </DataListItem>
      <DataListItem>
        <DataListLabel>Source</DataListLabel>
        <DataListValue>Stated in the session</DataListValue>
      </DataListItem>
      <DataListItem>
        <DataListLabel>Quote</DataListLabel>
        <DataListValue>
          <span className="flex flex-col gap-1">
            <span>&ldquo;{card.answered.quote}&rdquo;</span>
            <span className="flex items-center gap-2 type-body-sm text-text-2">
              Event E{card.answered.event}
              <Status status="ok" label="Verified" />
            </span>
          </span>
        </DataListValue>
      </DataListItem>
    </DataList>
  );
}

/** A small answer box: the question, the field, Submit and I don't know yet. Nothing is sent anywhere. */
function AnswerBox({ card, id }: { card: DemoCard; id: string }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{card.question}</FieldLabel>
      <Textarea id={id} rows={3} />
      <FieldDescription>
        In your own words. The why opens after you answer, so you see what you remembered first.
      </FieldDescription>
    </Field>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Option A: guided checklist. The page opens on the session's steps; each state is where the checklist stands.

type Check = { status: StatusValue; word: string; title: string; detail: string };

function checklist(state: SessionState): Check[] {
  const made: Record<SessionState, Check> = {
    processing: {
      status: "running",
      word: "Running",
      title: "Find the decisions",
      detail:
        "Reading the session for choices your agent made. Up to 5 cards, each backed by an exact quote.",
    },
    ready: {
      status: "ok",
      word: "Done",
      title: "Find the decisions",
      detail:
        "3 decision cards: choices your agent made, each with a quote from the session that backs it.",
    },
    failed: {
      status: "fail",
      word: "Failed",
      title: "Find the decisions",
      detail:
        "Making cards didn't finish. Nothing is lost: send the session again and it starts over.",
    },
    "no-cards": {
      status: "ok",
      word: "Done",
      title: "Find the decisions",
      detail: "None found. A card is kept only when an exact quote of 5 words or more backs it.",
    },
  };
  return [
    {
      status: "ok",
      word: "Done",
      title: "Send the session",
      detail: "The CLI removed secrets on your laptop, then uploaded the log.",
    },
    made[state],
    {
      status: state === "ready" ? "waiting" : "idle",
      word: state === "ready" ? "1 of 3" : "Not yet",
      title: "Explain each card back",
      detail:
        "Answer before you see the why; recalling is what makes it stick. Scored Missed, Partly or Explained.",
    },
    {
      status: "idle",
      word: "Later",
      title: "Come back on day 1, 4 and 11",
      detail:
        "Explained moves a card on; Partly or Missed brings it back tomorrow. Explained on day 11 and you own it.",
    },
  ];
}

function Checklist({ state }: { state: SessionState }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>How this session becomes knowledge</h2>
        </CardTitle>
        <CardDescription>Four steps. The first two run on their own.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-4 lg:grid-cols-4">
          {checklist(state).map((check, i) => (
            <li key={check.title} className="flex flex-col gap-2">
              <span className="flex items-center justify-between gap-2">
                <span className="type-label-sm text-text-3">Step {i + 1}</span>
                <Status status={check.status} label={check.word} />
              </span>
              <span className="type-label text-text-1">{check.title}</span>
              <span className="type-body-sm text-text-2">{check.detail}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function OptionA({ state }: { state: SessionState }) {
  return (
    <SessionPage state={state}>
      <Checklist state={state} />
      {state === "processing" && (
        <>
          <ProcessingState status="processing" />
          <IdeaNote>
            The checklist says what is happening now and what comes after, so a first session
            isn&rsquo;t a spinner with no context. Step 3 is greyed until the cards land.
          </IdeaNote>
        </>
      )}
      {state === "failed" && (
        <>
          <SessionFailedState error={FAILED_ERROR} />
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Do this next: send it again</h2>
              </CardTitle>
              <CardDescription>
                Run it in the project folder. A failed session starts over from step 2.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Terminal lines={RETRY_LINES} />
            </CardContent>
          </Card>
        </>
      )}
      {state === "no-cards" && (
        <EmptyState
          title="No decisions found in this session"
          description="Cards come from moments where your agent chose between options and said why. Next time, ask it to compare two approaches before it writes code, then push that session."
          action={
            <Link href="/dashboard" className={buttonVariants({ variant: "secondary" })}>
              See your other sessions
            </Link>
          }
        />
      )}
      {state === "ready" && (
        <div className="flex flex-col gap-6">
          {CARDS.map((card, i) => (
            <Card key={card.id} size="lg">
              <CardHeader>
                <CardTitle>
                  <h2>{card.decision}</h2>
                </CardTitle>
                <CardAction>
                  {card.answered ? (
                    <ScoreBadge score={2} />
                  ) : (
                    <Badge variant="outline">Step 3 · to do</Badge>
                  )}
                </CardAction>
              </CardHeader>
              <CardContent>
                {card.answered ? (
                  <div className="flex flex-col gap-4">
                    <Revealed card={card} />
                    <ScheduleStrip at={1} label="This card's review path" />
                    <p className="type-body-sm text-text-2">
                      Explained once. It comes back tomorrow, on day 1. Explain it again on days 4
                      and 11 to own it.
                    </p>
                  </div>
                ) : (
                  <AnswerBox card={card} id={`option-a-${card.id}`} />
                )}
              </CardContent>
              {!card.answered && (
                <CardFooter>
                  <div className="flex gap-2">
                    <Button>Submit answer</Button>
                    <Button variant="secondary">I don&rsquo;t know yet</Button>
                  </div>
                  {i === 1 && (
                    <span className="ms-auto flex items-center gap-2 type-body-sm text-text-3">
                      <LockSimpleIcon aria-hidden="true" />
                      The why isn&rsquo;t on this page yet, not even in its source.
                    </span>
                  )}
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}
    </SessionPage>
  );
}

export function SessionProcessingOptionA() {
  return <OptionA state="processing" />;
}
export function SessionReadyOptionA() {
  return <OptionA state="ready" />;
}
export function SessionFailedOptionA() {
  return <OptionA state="failed" />;
}
export function SessionNoCardsOptionA() {
  return <OptionA state="no-cards" />;
}

// ---------------------------------------------------------------------------------------------------------------
// Option B: explain as you go. Numbered marks on the page; the rail on the right explains each mark in a line or two.

type Note = { title: string; body: string };

const NOTES: Record<SessionState, Note[]> = {
  ready: [
    {
      title: "A decision card",
      body: "One choice your agent made in this session, worth knowing why. Up to 5 per session.",
    },
    {
      title: "The score",
      body: "Each answer is scored Missed, Partly or Explained. Explained means you gave the why.",
    },
    {
      title: "The why and its quote",
      body: "Every card is backed by an exact quote from the session, checked word for word. No quote, no card.",
    },
    {
      title: "The schedule",
      body: "Explained moves it on: day 1, 4, then 11. Explained on day 11 and you own it. Partly or Missed: back tomorrow.",
    },
    {
      title: "Answer first",
      body: "The why opens only after you answer, so you find out what you remember. Defend it, later, is optional.",
    },
  ],
  processing: [
    {
      title: "What is happening",
      body: "The session is read for choices your agent made and why. This page updates on its own.",
    },
    {
      title: "What you will get",
      body: "Up to 5 decision cards shaped like the outline: the decision, a question, then the why after you answer.",
    },
    {
      title: "Each card is checked",
      body: "A card is kept only when an exact quote of 5 words or more from the session backs it.",
    },
  ],
  failed: [
    {
      title: "What failed",
      body: "Making cards from this session didn't finish. The log is fine; the step that reads it stopped.",
    },
    {
      title: "How to retry",
      body: "Push the session again. It starts over from the beginning, and this page follows it.",
    },
  ],
  "no-cards": [
    {
      title: "Why there are none",
      body: "Every card needs an exact quote that backs it. This session had no choice with one.",
    },
    {
      title: "What gives the most cards",
      body: "Sessions where you and your agent talk through options: this or that, and why.",
    },
  ],
};

function Mark({ n }: { n: number }) {
  return (
    <Badge variant="outline" aria-label={`Note ${n}`}>
      {n}
    </Badge>
  );
}

function GuideRail({ state }: { state: SessionState }) {
  return (
    <aside aria-label="How to read this page" className="flex flex-col gap-3">
      <span className="type-label-sm text-text-3">How to read this page</span>
      {NOTES[state].map((note, i) => (
        <div key={note.title} className="flex gap-3 well p-3">
          <Mark n={i + 1} />
          <span className="flex flex-col gap-1">
            <span className="type-label text-text-1">{note.title}</span>
            <span className="type-body-sm text-text-2">{note.body}</span>
          </span>
        </div>
      ))}
    </aside>
  );
}

function CardOutline() {
  return (
    <Card size="lg">
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-3">
            <Mark n={2} />
            <Skeleton className="h-5 w-2/3" />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <span className="flex items-center gap-3">
            <Mark n={3} />
            <Skeleton className="h-4 w-1/3" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function OptionB({ state }: { state: SessionState }) {
  const [answered, locked] = CARDS;
  return (
    <SessionPage state={state}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          {state === "processing" && (
            <>
              <span className="flex items-center gap-3">
                <Mark n={1} />
                <span className="min-w-0 flex-1">
                  <ProcessingState status="processing" />
                </span>
              </span>
              <CardOutline />
            </>
          )}
          {state === "failed" && (
            <>
              <span className="flex items-start gap-3">
                <Mark n={1} />
                <span className="min-w-0 flex-1">
                  <SessionFailedState error={FAILED_ERROR} />
                </span>
              </span>
              <span className="flex items-start gap-3">
                <Mark n={2} />
                <span className="min-w-0 flex-1">
                  <Terminal lines={RETRY_LINES} />
                </span>
              </span>
            </>
          )}
          {state === "no-cards" && (
            <>
              <span className="flex items-start gap-3">
                <Mark n={1} />
                <span className="min-w-0 flex-1">
                  <EmptyState
                    title="No decisions found"
                    description="This session gave no cards. Your other sessions may have some waiting."
                    action={
                      <Link href="/dashboard" className={buttonVariants({ variant: "secondary" })}>
                        See your sessions
                      </Link>
                    }
                  />
                </span>
              </span>
              <span className="flex items-start gap-3 well p-3">
                <Mark n={2} />
                <span className="type-body-sm text-text-2">
                  Next session, ask your agent to compare two approaches and say why it picked one.
                </span>
              </span>
            </>
          )}
          {state === "ready" && (
            <>
              <Card size="lg">
                <CardHeader>
                  <CardTitle>
                    <span className="flex items-center gap-3">
                      <Mark n={1} />
                      <h2>{answered.decision}</h2>
                    </span>
                  </CardTitle>
                  <CardAction>
                    <span className="flex items-center gap-2">
                      <Mark n={2} />
                      <ScoreBadge score={2} />
                    </span>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <span className="flex items-start gap-3">
                      <Mark n={3} />
                      <span className="min-w-0 flex-1">
                        <Revealed card={answered} />
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <Mark n={4} />
                      <ScheduleStrip at={1} label="This card's review path" />
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card size="lg">
                <CardHeader>
                  <CardTitle>
                    <h2>{locked.decision}</h2>
                  </CardTitle>
                  <CardAction>
                    <Badge variant="outline">New</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <span className="flex items-center gap-3 type-body-sm text-text-3">
                      <Mark n={5} />
                      <LockSimpleIcon aria-hidden="true" />
                      Why, source and quote open after you answer.
                    </span>
                    <AnswerBox card={locked} id="option-b-answer" />
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex gap-2">
                    <Button>Submit answer</Button>
                    <Button variant="secondary">I don&rsquo;t know yet</Button>
                  </div>
                </CardFooter>
              </Card>
            </>
          )}
        </div>
        <GuideRail state={state} />
      </div>
    </SessionPage>
  );
}

export function SessionProcessingOptionB() {
  return <OptionB state="processing" />;
}
export function SessionReadyOptionB() {
  return <OptionB state="ready" />;
}
export function SessionFailedOptionB() {
  return <OptionB state="failed" />;
}
export function SessionNoCardsOptionB() {
  return <OptionB state="no-cards" />;
}

// ---------------------------------------------------------------------------------------------------------------
// Option C: focused single task. One card, one box, one next step. Explanations sit behind "What is this?" rows.

function Explainer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Collapsible>
      <CollapsibleRow size="sm">{title}</CollapsibleRow>
      <CollapsibleContent>
        <p className="px-2 pt-1 type-body-sm text-text-2">{children}</p>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Synthetic: the canvas has no grader, so these whys are written for the demo and show only after an answer.
const DEMO_WHY: Record<string, string> = {
  c2: "The CLI already backs off on Retry-After, so no client change was needed.",
  c3: "Several server instances share one count only if it lives in the database.",
};

/** The ready state: card 2 of 3 (card 1 is answered), answer first, then the why and the next card. Interactive. */
function FocusedCard() {
  const [index, setIndex] = useState(1);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"explained" | "skipped" | null>(null);
  const card = CARDS[index];
  const done = index + (result ? 1 : 0);
  const next = () => {
    setIndex(index + 1);
    setAnswer("");
    setResult(null);
  };
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Progress value={(done / CARDS.length) * 100}>
        <ProgressLabel>Cards answered in this session</ProgressLabel>
        <ProgressValue>{() => `${done} of ${CARDS.length}`}</ProgressValue>
      </Progress>
      <Card size="lg">
        <CardHeader>
          <CardTitle>
            <h2>{card.decision}</h2>
          </CardTitle>
          <CardDescription>A choice your agent made in this session.</CardDescription>
        </CardHeader>
        <CardContent>
          {result === null ? (
            <Field>
              <FieldLabel htmlFor={`option-c-${card.id}`}>{card.question}</FieldLabel>
              <Textarea
                id={`option-c-${card.id}`}
                rows={5}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
              <FieldDescription>
                Answer before you see the why. Recalling first is what makes it stick.
              </FieldDescription>
            </Field>
          ) : (
            <div className="flex flex-col gap-4">
              <span className="flex items-center gap-2">
                {result === "explained" ? (
                  <ScoreBadge score={2} />
                ) : (
                  <Badge variant="outline">Skipped</Badge>
                )}
                <span className="type-body-sm text-text-2">
                  {result === "explained"
                    ? "Comes back tomorrow, on day 1."
                    : "Read the why below. It comes back tomorrow, on day 1, for a first try."}
                </span>
              </span>
              <DataList>
                <DataListItem>
                  <DataListLabel>Why</DataListLabel>
                  <DataListValue>{DEMO_WHY[card.id]}</DataListValue>
                </DataListItem>
                <DataListItem>
                  <DataListLabel>Files</DataListLabel>
                  <DataListValue>
                    <Code>{card.files[0]}</Code>
                  </DataListValue>
                </DataListItem>
              </DataList>
              <ScheduleStrip at={1} label="This card's review path" />
            </div>
          )}
        </CardContent>
        <CardFooter>
          {result === null ? (
            <div className="flex gap-2">
              <Button disabled={!answer.trim()} onClick={() => setResult("explained")}>
                Submit answer
              </Button>
              <Button variant="secondary" onClick={() => setResult("skipped")}>
                I don&rsquo;t know yet
              </Button>
            </div>
          ) : index < CARDS.length - 1 ? (
            <Button onClick={next}>
              Next card
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          ) : (
            <Link href="/dashboard" className={buttonVariants()}>
              All 3 answered: back to your sessions
            </Link>
          )}
        </CardFooter>
      </Card>
      <div className="flex flex-col gap-1">
        <Explainer title="What is a decision card?">
          One choice your coding agent made in a session, with the question of why. Each is backed
          by an exact quote from the session, so it is about your code, not code in general.
        </Explainer>
        <Explainer title="Why can't I see the why first?">
          Reading an answer feels like knowing it. Trying to explain it first shows what you
          actually remember, and that effort is what makes it last. The why isn&rsquo;t sent to your
          browser until you answer.
        </Explainer>
        <Explainer title="What do day 1, 4 and 11 mean?">
          Explain it right and the card comes back after 1 day, then 3, then 7: days 1, 4 and 11.
          Partly or Missed moves it one step back, due tomorrow. At most 5 cards a day.
        </Explainer>
        <Explainer title="Explained vs owned">
          Explained means you got it right at least once. Owned means you still got it right on day
          11, a week and a half later. Defend it, a timed follow-up on one explained card, is
          optional.
        </Explainer>
      </div>
    </div>
  );
}

/** A non-ready state: one centred task with one action, and the reason behind a row. */
function FocusedTask({
  icon,
  title,
  body,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Card size="lg">
        <CardHeader>
          <CardTitle>
            <h2 className="flex items-center gap-2">
              {icon}
              {title}
            </h2>
          </CardTitle>
          <CardDescription>{body}</CardDescription>
        </CardHeader>
        {children && <CardContent>{children}</CardContent>}
        <CardFooter>{action}</CardFooter>
      </Card>
    </div>
  );
}

function OptionC({ state }: { state: SessionState }) {
  return (
    <SessionPage state={state}>
      {state === "ready" && <FocusedCard />}
      {state === "processing" && (
        <FocusedTask
          icon={<SparkleIcon aria-hidden="true" />}
          title="Your cards are on the way"
          body="This session is being read for choices your agent made. Up to 5 cards land here on their own; you don't need to stay."
          action={
            <Link href="/review" className={buttonVariants()}>
              Review 3 due cards meanwhile
            </Link>
          }
        >
          <div className="flex flex-col gap-3">
            <Progress value={null}>
              <ProgressLabel>Reading the session</ProgressLabel>
            </Progress>
            <Explainer title="What will I get?">
              Decision cards: one choice each, a question about why, and an exact quote from the
              session behind it. You answer first; the why opens after.
            </Explainer>
          </div>
        </FocusedTask>
      )}
      {state === "failed" && (
        <FocusedTask
          icon={<Status status="fail" label="Failed" />}
          title="Send this session again"
          body="Making cards didn't finish. Nothing you did is lost: pushing it again starts over."
          action={
            <Button
              variant="secondary"
              onClick={() => void navigator.clipboard?.writeText("npx session-coach push --latest")}
            >
              Copy the command
            </Button>
          }
        >
          <div className="flex flex-col gap-3">
            <Terminal lines={RETRY_LINES} />
            <Explainer title="Run it where?">
              In the project folder. --latest sends the newest session of that project; if this
              wasn&rsquo;t the newest, pass its file instead: session-coach push
              ./your-session.jsonl
            </Explainer>
          </div>
        </FocusedTask>
      )}
      {state === "no-cards" && (
        <FocusedTask
          icon={<QuotesIcon aria-hidden="true" />}
          title="No decisions found here"
          body="A card is kept only when an exact quote from the session backs it, and this session had none."
          action={
            <Link href="/dashboard" className={buttonVariants({ variant: "secondary" })}>
              Open another session
            </Link>
          }
        >
          <Explainer title="How do I get more cards next time?">
            Talk through options with your agent: ask it to compare two approaches and say why it
            picked one. Those moments become cards.
          </Explainer>
        </FocusedTask>
      )}
    </SessionPage>
  );
}

export function SessionProcessingOptionC() {
  return <OptionC state="processing" />;
}
export function SessionReadyOptionC() {
  return <OptionC state="ready" />;
}
export function SessionFailedOptionC() {
  return <OptionC state="failed" />;
}
export function SessionNoCardsOptionC() {
  return <OptionC state="no-cards" />;
}
