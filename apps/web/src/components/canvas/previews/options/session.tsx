"use client";

// Redesign options for /s/[id], one session's page, in each of its four states: processing, ready with decision cards,
// failed, and ready with no decisions found. Three layout ideas, each teaching on the page itself:
//   A, guided checklist: the session's steps as a checklist at the top, every state a step in it.
//   B, explain as you go: the page on the left, a guide rail on the right whose numbered notes match marks on the page.
//   C, focused single task: one thing to do, centred, with the rest one click away.
// Synthetic data only. The why of a card shows only on a card the learner has answered, as on the real page.

import { ArrowRightIcon, CheckIcon, LockSimpleIcon } from "@phosphor-icons/react";
import Link from "next/link";

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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Code } from "@/components/ui/code-block";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { PageHeaderStat, PageHeaderStats } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Status } from "@/components/ui/status";
import { Textarea } from "@/components/ui/textarea";

import { AppFrame, FRAME_SESSIONS } from "../frames";
import { Terminal } from "../parts";

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
