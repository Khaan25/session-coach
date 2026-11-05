"use client";

// Options for the public pages (/, /how-it-works, /pricing, /support), three layouts each. Every option teaches on the
// page itself: what a decision card is, why you answer before the why shows, what day 1, 4 and 11 mean, what explained
// and owned mean, and what to do next. All data is synthetic. The sample card's why stays hidden until it is answered.

import {
  ArrowsClockwiseIcon,
  CardsIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  EnvelopeSimpleIcon,
  EyeSlashIcon,
  FlagIcon,
  LightbulbIcon,
  LockKeyIcon,
  MagnifyingGlassIcon,
  QuotesIcon,
  TerminalWindowIcon,
  type Icon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

import { ScoreBadge, type Score } from "@/components/app/score-badge";
import { Faq, type FaqEntry } from "@/components/marketing/faq";
import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
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
import { Collapsible, CollapsibleContent, CollapsibleRow } from "@/components/ui/collapsible";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supportEmail } from "@/lib/site";

import { PublicFrame } from "../frames";
import { Terminal } from "../parts";
import { CARDS } from "../prototype-data";
import { grade } from "../prototype-grade";

const SAMPLE = CARDS[0];

const PAGE = "mx-auto flex w-full max-w-(--container) flex-col px-(--gutter-sm) sm:px-(--gutter)";

const LOGIN = "npx session-coach login";
const PUSH = "npx session-coach push --latest";

// ---------------------------------------------------------------------------------------------------------------
// Shared teaching pieces
// ---------------------------------------------------------------------------------------------------------------

type Result = { score: Score; missing: string | null; skipped: boolean };

/** What a score does to a new card on day 1, from lib/review/schedule.ts. */
function nextStep(result: Result) {
  if (result.skipped)
    return "“I don’t know yet” scores 0 but keeps the card on day 1. It comes back tomorrow.";
  if (result.score === 2) return "Explained, so the card moves to day 4: it comes back in 3 days.";
  return "Below 2, so the card stays on day 1 and comes back tomorrow. A miss never resets your progress.";
}

/** The sample card to answer. The why, the quote's meaning and the score appear only after an answer. */
function TryCard({ id, onResult }: { id: string; onResult?: (result: Result | null) => void }) {
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const finish = (next: Result | null) => {
    setResult(next);
    onResult?.(next);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>{SAMPLE.decision}</CardTitle>
        <CardDescription>
          Sample card from a {SAMPLE.repo} session · {SAMPLE.file}
        </CardDescription>
        <CardAction>
          <Badge variant="outline">
            <QuotesIcon aria-hidden />
            Stated
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {result ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <ScoreBadge score={result.score} />
                <span className="type-body-sm text-text-2">{nextStep(result)}</span>
              </div>
              <div className="flex flex-col gap-2 well p-4">
                <span className="type-label-sm text-text-3">The why</span>
                <p className="type-body text-text-1">{SAMPLE.why}</p>
                <p className="flex gap-2 type-body-sm text-text-2">
                  <QuotesIcon aria-hidden className="mt-1 shrink-0" />
                  <span>
                    “{SAMPLE.evidence}”, quoted from the session and checked by plain code.
                  </span>
                </p>
                {result.missing && (
                  <p className="type-body-sm text-text-2">Missing idea: {result.missing}</p>
                )}
              </div>
            </>
          ) : (
            <Field>
              <FieldLabel htmlFor={id}>{SAMPLE.question}</FieldLabel>
              <Textarea
                id={id}
                rows={3}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="In your own words…"
              />
              <FieldDescription>
                The why stays hidden until you answer, so the score shows what you can explain, not
                what you just read.
              </FieldDescription>
            </Field>
          )}
        </div>
      </CardContent>
      <CardFooter>
        {result ? (
          <Button
            variant="ghost"
            onClick={() => {
              setAnswer("");
              finish(null);
            }}
          >
            Try again
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              disabled={!answer.trim()}
              onClick={() => finish({ ...grade(SAMPLE.ideas, answer), skipped: false })}
            >
              Check my answer
            </Button>
            <Button
              variant="ghost"
              onClick={() => finish({ score: 0, missing: null, skipped: true })}
            >
              I don’t know yet
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

const STOPS = [
  { label: "Day 1", gap: "1 day after the session" },
  { label: "Day 4", gap: "3 days after a 2" },
  { label: "Day 11", gap: "7 days after a 2" },
  { label: "Owned", gap: "a 2 on day 11" },
] as const;

/** The schedule as four stops. `at` lights the stops reached so far. */
function ScheduleTrack({ at = -1 }: { at?: number }) {
  return (
    <ol className="grid grid-cols-4 gap-3">
      {STOPS.map((stop, i) => (
        <li key={stop.label} className="flex flex-col gap-1 border-t-2 border-line-row pt-3">
          <span className="flex items-center gap-2 type-label text-text-1">
            {i <= at ? <Badge variant="success">{stop.label}</Badge> : stop.label}
          </span>
          <span className="type-body-sm text-text-2">{stop.gap}</span>
        </li>
      ))}
    </ol>
  );
}

/** One repo's meter with the two words defined next to it. Synthetic numbers. */
function OwnershipMeter() {
  return (
    <div className="flex flex-col gap-4">
      <Progress value={2} max={30}>
        <ProgressLabel>session-coach</ProgressLabel>
        <ProgressValue>{() => "Explained 9 · owned 2 of 30"}</ProgressValue>
      </Progress>
      <dl className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <dt className="type-label text-text-1">Explained</dt>
          <dd className="type-body-sm text-text-2">
            You scored 2 on the card at least once. You can then defend it, if you want.
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="type-label text-text-1">Owned</dt>
          <dd className="type-body-sm text-text-2">
            You scored 2 on its last review, day 11. The card is done.
          </dd>
        </div>
      </dl>
    </div>
  );
}

function Cta({ secondary = "/how-it-works" }: { secondary?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link href="/setup" className={buttonVariants({ size: "lg" })}>
        <TerminalWindowIcon weight="duotone" data-icon="inline-start" aria-hidden />
        Set it up
      </Link>
      <Link href={secondary} className={buttonVariants({ size: "lg", variant: "secondary" })}>
        {secondary === "/how-it-works" ? "See how it works" : "Questions"}
      </Link>
    </div>
  );
}

function Note({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-s-2 border-accent-line ps-3">
      <span className="type-label text-text-1">{title}</span>
      <span className="type-body-sm text-text-2">{children}</span>
    </div>
  );
}

const KINDS: { icon: Icon; title: string; body: string; badge: BadgeProps }[] = [
  {
    icon: QuotesIcon,
    title: "Stated",
    body: "Quotes the reason your agent gave.",
    badge: { variant: "outline" },
  },
  {
    icon: LightbulbIcon,
    title: "Inferred",
    body: "The agent wrote no reason, so this is the model’s guess, labelled as one.",
    badge: { variant: "outline" },
  },
  {
    icon: FlagIcon,
    title: "Flagged",
    body: "A quote couldn’t be verified. You still see the card, labelled.",
    badge: { status: "warn" },
  },
  {
    icon: EyeSlashIcon,
    title: "Hidden",
    body: "No quote matches the session, so you never see it.",
    badge: { variant: "ghost" },
  },
];

function KindList() {
  return (
    <ItemGroup>
      {KINDS.map(({ icon: KindIcon, title, body, badge }) => (
        <Item key={title} size="sm">
          <ItemMedia variant="icon">
            <KindIcon aria-hidden />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>
              <Badge {...badge}>{title}</Badge>
            </ItemTitle>
            <ItemDescription>{body}</ItemDescription>
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// / (landing)
// ---------------------------------------------------------------------------------------------------------------

const FIRST_STEPS = [
  {
    title: "Sign in from your terminal",
    command: LOGIN,
    body: "It shows a code and opens your browser. Approve the device; there is no token to copy.",
    more: "The setup page also gives you one prompt to paste into your AI, which runs these steps for you.",
  },
  {
    title: "Send a session",
    command: PUSH,
    body: "Your latest Claude Code session becomes up to 5 decision cards, filed under its project.",
    more: "A decision card is one choice your agent made, a question about it, and a quote from the session that shows it happened. The CLI removes secrets it recognises on your laptop first; it can miss some.",
  },
  {
    title: "Answer before you see the why",
    command: null,
    body: "Each card asks why. You write the reason in your own words, then the card shows its reason and scores you 0, 1 or 2.",
    more: "Answering first is the point: reading the reason feels like knowing it. Writing it shows whether you do.",
  },
  {
    title: "Come back on day 1, 4 and 11",
    command: null,
    body: "A 2 sends the card further out. Below 2, it comes back tomorrow. A 2 on day 11 means you own it.",
    more: "A daily email tells you when cards are due, and you can turn it off. A missed day never resets anything.",
  },
] as const;

/** A: the hero beside a numbered checklist of the first week, each step with an inline "what this means". */
export function MarketingLandingOptionA() {
  return (
    <PublicFrame path="/">
      <div className={`${PAGE} grid grid-cols-2 items-start gap-16 py-12`}>
        <div className="flex flex-col gap-8">
          <h1 className="font-display text-7xl leading-none tracking-tight text-balance text-text-1">
            <span className="italic">Own</span> the code your agent writes.
          </h1>
          <p className="max-w-lg type-body-lg text-pretty text-text-2">
            Session Coach turns each Claude Code session into up to 5 decision cards, then asks you
            why on day 1, 4 and 11 until you can explain it. Four steps; open one to see what it
            means.
          </p>
          <Cta />
          <p className="type-body-sm text-text-2">Free during the trial. Built for Claude Code.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Your first week</CardTitle>
            <CardDescription>What you’ll do, in order.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2">
              {FIRST_STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-tint type-label text-accent-label">
                    {i + 1}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-2 pb-4">
                    <span className="type-label text-text-1">{step.title}</span>
                    <span className="type-body-sm text-text-2">{step.body}</span>
                    {step.command && <Terminal lines={[`$ ${step.command}`]} />}
                    <Collapsible>
                      <CollapsibleRow size="row">What this means</CollapsibleRow>
                      <CollapsibleContent>
                        <p className="px-3 pb-2 type-body-sm text-text-2">{step.more}</p>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </PublicFrame>
  );
}

/** B: a live sample card on the left, and notes on the right that explain each part as you reach it. */
export function MarketingLandingOptionB() {
  const [result, setResult] = useState<Result | null>(null);
  return (
    <PublicFrame path="/">
      <div className={`${PAGE} gap-12 py-16`}>
        <div className="flex max-w-3xl flex-col gap-4">
          <h1 className="font-display text-6xl leading-none tracking-tight text-balance text-text-1">
            <span className="italic">Own</span> the code your agent writes.
          </h1>
          <p className="type-body-lg text-pretty text-text-2">
            This is a decision card. Every Claude Code session you send becomes up to 5 of them.
            Answer it; the notes on the right follow along.
          </p>
        </div>
        <div className="grid grid-cols-5 items-start gap-12">
          <div className="col-span-3">
            <TryCard id="opt-landing-b-answer" onResult={setResult} />
          </div>
          <aside aria-label="What you're looking at" className="col-span-2 flex flex-col gap-6">
            {result ? (
              <>
                <Note title="The score">
                  2 is Explained, 1 Partly, 0 Missed. On the real site a model scores it against the
                  card’s reason and quotes.
                </Note>
                <Note title="The schedule">
                  Reviews land on day 1, 4 and 11. A 2 moves the card out; less brings it back
                  tomorrow.
                </Note>
                <ScheduleTrack at={result.score === 2 && !result.skipped ? 1 : 0} />
                <Note title="Next">
                  Send your own session and these are your agent’s decisions, not ours.
                </Note>
                <Cta />
              </>
            ) : (
              <>
                <Note title="The decision">One choice your agent made in the session.</Note>
                <Note title="The question">
                  Why it made that choice. You answer in your own words.
                </Note>
                <Note title="Stated">
                  The agent wrote its reason down, and the card quotes it. You’ll see the quote
                  after you answer.
                </Note>
                <Note title="Why answer first">
                  Reading a reason feels like knowing it. Writing it shows whether you do.
                </Note>
              </>
            )}
          </aside>
        </div>
      </div>
    </PublicFrame>
  );
}

/** C: one task and nothing else. Answer the card; only then does the page explain what happened and what's next. */
export function MarketingLandingOptionC() {
  const [result, setResult] = useState<Result | null>(null);
  return (
    <PublicFrame path="/">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-(--gutter-sm) py-16 sm:px-(--gutter)">
        <div className="flex flex-col gap-3 text-center">
          <span className="type-label-sm text-text-3">Try one card. No account needed.</span>
          <h1 className="font-display text-5xl leading-none text-balance text-text-1">
            Could you explain this decision?
          </h1>
          <p className="type-body text-text-2">
            Session Coach turns your Claude Code sessions into cards like this one and asks you why
            on day 1, 4 and 11. This sample is from a made-up session: write why, then see the
            reason.
          </p>
        </div>
        <TryCard id="opt-landing-c-answer" onResult={setResult} />
        {result && (
          <Card variant="panel">
            <CardHeader>
              <CardTitle>What just happened</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex list-decimal flex-col gap-2 ps-5 type-body-sm text-text-2">
                <li>You answered before seeing the why. That is the whole method.</li>
                <li>The card is now on the schedule: day 1, then 4, then 11.</li>
                <li>A 2 on day 11 and you own the decision.</li>
              </ol>
            </CardContent>
            <CardFooter>
              <Cta />
            </CardFooter>
          </Card>
        )}
      </div>
    </PublicFrame>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// /how-it-works
// ---------------------------------------------------------------------------------------------------------------

const PIPELINE: {
  icon: Icon;
  title: string;
  summary: string;
  body: string;
  example: React.ReactNode;
}[] = [
  {
    icon: TerminalWindowIcon,
    title: "Sign in from your terminal",
    summary: "One code, one click",
    body: "Run session-coach login. It shows a code, and you approve this device in your browser. Nothing to copy.",
    example: (
      <Terminal lines={[`$ ${LOGIN}`, "Opening your browser. Approve this device there."]} />
    ),
  },
  {
    icon: CloudArrowUpIcon,
    title: "Send a session",
    summary: "Known secret shapes removed first",
    body: "push --latest sends your latest session. Opt a project in and a SessionStart hook runs sync for you. The CLI tries to remove secrets on your laptop, then uploads. Logs over 50 MB are refused, and no session is taken twice.",
    example: <Terminal lines={[`$ ${PUSH}`, "Sent. Making cards."]} />,
  },
  {
    icon: CardsIcon,
    title: "Cards are made",
    summary: "Up to 5 per session",
    body: "The server keeps prompts, the agent’s text, edit summaries and commands, removes secrets again, and one model call turns that into up to 5 decision cards. A session with no clear decision gets none.",
    example: (
      <div className="flex gap-2">
        <Badge>Making cards</Badge>
        <Badge variant="success">Cards ready</Badge>
      </div>
    ),
  },
  {
    icon: MagnifyingGlassIcon,
    title: "Every quote is checked",
    summary: "Plain code, not a model",
    body: "Each card quotes the session. Code checks each quoted event exists, contains the quote, and that the quote is at least 5 words.",
    example: <KindList />,
  },
  {
    icon: ArrowsClockwiseIcon,
    title: "You review",
    summary: "Day 1, 4 and 11",
    body: "Answer each card before you see its reason. A 2 moves it out; less brings it back tomorrow, one step down. A 2 on day 11 and you own it.",
    example: <ScheduleTrack at={1} />,
  },
];

/** A: the pipeline as a vertical list of disclosures. Closed, each row is one line; open, it explains and shows it. */
export function MarketingHowItWorksOptionA() {
  return (
    <PublicFrame path="/how-it-works">
      <div className={`${PAGE} gap-10 py-16`}>
        <MarketingPageHeader title="How it works">
          From a finished session to a decision you own, in five steps. Open a step for the detail
          and what you’ll see.
        </MarketingPageHeader>
        <ol className="flex max-w-3xl flex-col divide-y divide-line-row">
          {PIPELINE.map(({ icon: StepIcon, title, summary, body, example }, i) => (
            <li key={title} className="py-2">
              <Collapsible defaultOpen={i === 0}>
                <CollapsibleRow size="row" summary={summary}>
                  <StepIcon aria-hidden />
                  {i + 1}. {title}
                </CollapsibleRow>
                <CollapsibleContent>
                  <div className="grid grid-cols-2 gap-6 px-3 pt-2 pb-4">
                    <p className="type-body text-text-2">{body}</p>
                    {example}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </li>
          ))}
        </ol>
        <Cta secondary="/support" />
      </div>
    </PublicFrame>
  );
}

/** B: three tabs by where things happen (your laptop, our server, your review), each prose beside its artifact. */
export function MarketingHowItWorksOptionB() {
  return (
    <PublicFrame path="/how-it-works">
      <div className={`${PAGE} gap-10 py-16`}>
        <MarketingPageHeader title="How it works">
          Three places, in order. Pick one to see what happens there.
        </MarketingPageHeader>
        <Tabs defaultValue="laptop">
          <TabsList>
            <TabsTrigger value="laptop">
              <TerminalWindowIcon aria-hidden />
              On your laptop
            </TabsTrigger>
            <TabsTrigger value="server">
              <CardsIcon aria-hidden />
              On our server
            </TabsTrigger>
            <TabsTrigger value="review">
              <ArrowsClockwiseIcon aria-hidden />
              In your review
            </TabsTrigger>
          </TabsList>
          <TabsContent value="laptop">
            <div className="grid grid-cols-2 gap-12 pt-8">
              <div className="flex flex-col gap-4">
                {PIPELINE.slice(0, 2).map((step) => (
                  <Note key={step.title} title={step.title}>
                    {step.body}
                  </Note>
                ))}
              </div>
              <Terminal
                lines={[
                  `$ ${LOGIN}`,
                  "Approved. Signed in.",
                  "",
                  `$ ${PUSH}`,
                  "Sent. Making cards.",
                ]}
              />
            </div>
          </TabsContent>
          <TabsContent value="server">
            <div className="grid grid-cols-2 gap-12 pt-8">
              <div className="flex flex-col gap-4">
                {PIPELINE.slice(2, 4).map((step) => (
                  <Note key={step.title} title={step.title}>
                    {step.body}
                  </Note>
                ))}
              </div>
              <KindList />
            </div>
          </TabsContent>
          <TabsContent value="review">
            <div className="grid grid-cols-2 gap-12 pt-8">
              <div className="flex flex-col gap-6">
                <Note title="Answer first">{PIPELINE[4].body}</Note>
                <ScheduleTrack at={1} />
              </div>
              <OwnershipMeter />
            </div>
          </TabsContent>
        </Tabs>
        <Cta secondary="/support" />
      </div>
    </PublicFrame>
  );
}

const ANATOMY = [
  { title: "The decision", body: "One choice your agent made, in a line." },
  {
    title: "The kind",
    body: "Stated quotes the agent’s reason. Inferred is the model’s guess, labelled.",
  },
  { title: "The question", body: "Why the agent chose this. You answer in your own words." },
  { title: "The why, locked", body: "Shown only after you answer, so the score is honest." },
  {
    title: "The quote, locked",
    body: "Words from the session, at least 5, checked by plain code. It would give the answer away.",
  },
  { title: "The review day", body: "Day 1, 4 or 11. A 2 on day 11 and you own it." },
] as const;

function Marker({ n }: { n: number }) {
  return (
    <Badge size="sm" aria-label={`Part ${n}`}>
      {n}
    </Badge>
  );
}

/** C: one card, taken apart. Numbered markers on the card match a legend beside it. */
export function MarketingHowItWorksOptionC() {
  return (
    <PublicFrame path="/how-it-works">
      <div className={`${PAGE} gap-10 py-16`}>
        <MarketingPageHeader title="Anatomy of a decision card">
          Each session you send becomes up to 5 of these. Here is what every part is for.
        </MarketingPageHeader>
        <div className="grid grid-cols-5 items-start gap-12">
          <div className="col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="flex items-center gap-2">
                    <Marker n={1} />
                    {SAMPLE.decision}
                  </span>
                </CardTitle>
                <CardDescription>
                  {SAMPLE.repo} · {SAMPLE.file}
                </CardDescription>
                <CardAction>
                  <span className="flex items-center gap-2">
                    <Marker n={2} />
                    <Badge variant="outline">
                      <QuotesIcon aria-hidden />
                      Stated
                    </Badge>
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-5">
                  <p className="flex gap-2 type-body text-text-1">
                    <Marker n={3} />
                    {SAMPLE.question}
                  </p>
                  <div className="flex flex-col gap-3 well p-4 type-body-sm text-text-2">
                    <span className="flex items-center gap-2">
                      <Marker n={4} />
                      <LockKeyIcon aria-hidden />
                      The why appears after you answer.
                    </span>
                    <span className="flex items-center gap-2">
                      <Marker n={5} />
                      <LockKeyIcon aria-hidden />
                      So does the quote from the session.
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <span className="flex items-center gap-2">
                  <Marker n={6} />
                  <Badge variant="outline">Day 1 review</Badge>
                </span>
              </CardFooter>
            </Card>
          </div>
          <ol className="col-span-2 flex flex-col gap-4">
            {ANATOMY.map((part, i) => (
              <li key={part.title} className="flex gap-3">
                <Marker n={i + 1} />
                <span className="flex flex-col gap-1">
                  <span className="type-label text-text-1">{part.title}</span>
                  <span className="type-body-sm text-text-2">{part.body}</span>
                </span>
              </li>
            ))}
            <li>
              <Cta secondary="/support" />
            </li>
          </ol>
        </div>
      </div>
    </PublicFrame>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// /pricing
// ---------------------------------------------------------------------------------------------------------------

const TRIAL = "Free during the 8x Playmakers trial, 28 Oct to 6 Nov 2026.";
const NO_CHARGE = "No card needed, and we won’t charge you without asking first.";

const INCLUDED = [
  {
    item: "The command-line tool",
    plain:
      "Sends your sessions, with an opt-in hook per project. Secrets are filtered on your laptop first.",
  },
  {
    item: "Up to 5 decision cards per session",
    plain:
      "Each card is one choice your agent made, with a quote from the session that plain code checked.",
  },
  {
    item: "Reviews on day 1, 4 and 11",
    plain: "You answer before you see the why, and each answer is scored 0, 1 or 2.",
  },
  {
    item: "Progress by project",
    plain: "Explained means a 2 at least once. Owned means a 2 on the day-11 review.",
  },
  {
    item: "A daily email when cards are due",
    plain: "Only on days something is due. You can turn it off.",
  },
] as const;

function PlanCard() {
  return (
    <Card size="lg">
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-3">
            Trial
            <Badge variant="success">Free</Badge>
          </span>
        </CardTitle>
        <CardDescription>
          {TRIAL} {NO_CHARGE}
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Link href="/setup" className={buttonVariants({ size: "lg" })}>
          Set it up
        </Link>
      </CardFooter>
    </Card>
  );
}

/** A: the plan beside what the first two weeks look like, so "what do I get" is answered as a schedule. */
export function MarketingPricingOptionA() {
  const timeline = [
    {
      when: "Today",
      what: "Sign in from your terminal and send a session. Cards are ready on your dashboard.",
    },
    { when: "Day 1", what: "First review. Answer each card before you see its reason." },
    {
      when: "Day 4",
      what: "Cards you explained on day 1 come back. A card below 2 came back the next day instead.",
    },
    { when: "Day 11", what: "Last review. A 2 here and the decision is owned." },
  ];
  return (
    <PublicFrame path="/pricing">
      <div className={`${PAGE} gap-12 py-16`}>
        <MarketingPageHeader title="Pricing">
          One plan, and it’s free during the trial.
        </MarketingPageHeader>
        <div className="grid grid-cols-2 items-start gap-12">
          <PlanCard />
          <section aria-labelledby="opt-pricing-a-week" className="flex flex-col gap-4">
            <h2 id="opt-pricing-a-week" className="type-label text-text-1">
              What the plan looks like in use
            </h2>
            <ol className="flex flex-col gap-4">
              {timeline.map((row) => (
                <li key={row.when} className="grid grid-cols-4 gap-4">
                  <span>
                    <Badge variant="outline">{row.when}</Badge>
                  </span>
                  <span className="col-span-3 type-body-sm text-text-2">{row.what}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </PublicFrame>
  );
}

/** B: what's included as rows, each with its plain-words meaning beside it instead of a bare checklist. */
export function MarketingPricingOptionB() {
  return (
    <PublicFrame path="/pricing">
      <div className={`${PAGE} gap-10 py-16`}>
        <div className="flex items-end justify-between gap-8">
          <MarketingPageHeader title="Pricing">
            {TRIAL} {NO_CHARGE}
          </MarketingPageHeader>
          <Link href="/setup" className={buttonVariants({ size: "lg" })}>
            Set it up
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-3">
                Everything in the trial
                <Badge variant="success">Free</Badge>
              </span>
            </CardTitle>
            <CardDescription>What each part is, in plain words.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col divide-y divide-line-row">
              {INCLUDED.map((row) => (
                <div key={row.item} className="grid grid-cols-3 gap-6 py-4">
                  <dt className="flex items-start gap-2 type-label text-text-1">
                    <CheckCircleIcon weight="duotone" aria-hidden className="mt-0.5 shrink-0" />
                    {row.item}
                  </dt>
                  <dd className="col-span-2 type-body-sm text-text-2">{row.plain}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </PublicFrame>
  );
}

/** C: one number, one button, and the three questions people ask before pressing it, answered in place. */
export function MarketingPricingOptionC() {
  const questions = [
    { q: "Do I need a card?", a: NO_CHARGE },
    { q: "How long is it free?", a: TRIAL },
    {
      q: "What do I get?",
      a: "Up to 5 decision cards per session, reviews on day 1, 4 and 11, and progress by project.",
    },
  ];
  return (
    <PublicFrame path="/pricing">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-10 px-(--gutter-sm) py-20 text-center sm:px-(--gutter)">
        <div className="flex flex-col items-center gap-4">
          <h1 className="font-display text-8xl leading-none text-text-1">Free</h1>
          <p className="type-body-lg text-text-2">
            One plan with everything in it, during the trial.
          </p>
        </div>
        <Link href="/setup" className={buttonVariants({ size: "lg" })}>
          <TerminalWindowIcon weight="duotone" data-icon="inline-start" aria-hidden />
          Set it up
        </Link>
        <dl className="grid w-full grid-cols-3 gap-6 text-start">
          {questions.map((row) => (
            <div key={row.q} className="flex flex-col gap-2">
              <dt className="type-label text-text-1">{row.q}</dt>
              <dd className="type-body-sm text-text-2">{row.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </PublicFrame>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// /support
// ---------------------------------------------------------------------------------------------------------------

const PROBLEMS = [
  {
    value: "failed",
    label: "A session failed",
    answer: "Open the session on your dashboard: it says why it failed.",
    next: "Send it again with the session’s log file.",
    command: "$ npx session-coach push <file.jsonl>",
  },
  {
    value: "no-cards",
    label: "No cards appeared",
    answer: "A session with no clear decision gets no cards. That is expected, not an error.",
    next: "Send a session where your agent made a real choice.",
    command: `$ ${PUSH}`,
  },
  {
    value: "offline",
    label: "The hook sent nothing",
    answer: "Offline, the hook sends nothing and tries again the next time a session starts.",
    next: "Read what went wrong in the sync log.",
    command: "$ cat ~/.session-coach/sync.log",
  },
  {
    value: "flagged",
    label: "A card is flagged",
    answer:
      "One of its quotes couldn’t be verified against the session. You still see it, labelled.",
    next: "Answer it as usual, or weigh the quote with care.",
    command: null,
  },
] as const;

/** A: a troubleshooter. Pick what's wrong; get the cause, the next step and the exact command. */
export function MarketingSupportOptionA() {
  const [pick, setPick] = useState<string>(PROBLEMS[0].value);
  const problem = PROBLEMS.find((p) => p.value === pick) ?? PROBLEMS[0];
  return (
    <PublicFrame path="/support">
      <div className={`${PAGE} gap-10 py-16`}>
        <MarketingPageHeader title="Support">What’s going on? Pick one.</MarketingPageHeader>
        <SegmentedControl aria-label="What's going on" value={pick} onValueChange={setPick}>
          {PROBLEMS.map((p) => (
            <SegmentedControlItem key={p.value} value={p.value}>
              {p.label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        <div className="grid max-w-4xl grid-cols-2 gap-8">
          <Note title="Why it happens">{problem.answer}</Note>
          <div className="flex flex-col gap-3">
            <Note title="What to do next">{problem.next}</Note>
            {problem.command && <Terminal lines={[problem.command]} />}
          </div>
        </div>
        <p className="flex items-center gap-2 type-body-sm text-text-2">
          <EnvelopeSimpleIcon aria-hidden />
          Not it? Email{" "}
          <a href={`mailto:${supportEmail}`} className="text-text-1 underline">
            {supportEmail}
          </a>
        </p>
      </div>
    </PublicFrame>
  );
}

const TOPICS: { value: string; label: string; entries: FaqEntry[] }[] = [
  {
    value: "sending",
    label: "Sending sessions",
    entries: [
      {
        question: "What does Session Coach send from my laptop?",
        answer:
          "Only the session logs you send. push sends one; the opt-in SessionStart hook runs sync to send finished sessions.",
      },
      { question: "What happens if I'm offline?", answer: PROBLEMS[2].answer },
      {
        question: "A session failed. What now?",
        answer: `${PROBLEMS[0].answer} ${PROBLEMS[0].next}`,
      },
    ],
  },
  {
    value: "data",
    label: "Secrets and data",
    entries: [
      {
        question: "Are my secrets stored?",
        answer:
          "We try not to. They are removed on your laptop and again on the server, but removal is not a guarantee.",
      },
      {
        question: "Where is my data stored?",
        answer: "In Supabase, in the ap-south-1 region.",
      },
    ],
  },
  {
    value: "cards",
    label: "Cards",
    entries: KINDS.map((kind) => ({
      question: `What does ${kind.title} mean?`,
      answer: kind.body,
    })),
  },
  {
    value: "scoring",
    label: "Scoring and schedule",
    entries: [
      {
        question: "How are my answers scored?",
        answer: "0, 1 or 2 against the card’s reason, its quotes and a model answer.",
      },
      {
        question: "When does a card come back?",
        answer:
          "Reviews land on day 1, 4 and 11. A 2 moves it out; 0 or 1 moves it one step down (never below day 1), due tomorrow.",
      },
      {
        question: "What's the difference between explained and owned?",
        answer: "Explained is a 2 at least once. Owned is a 2 on the day-11 review.",
      },
    ],
  },
];

/** B: questions grouped by topic in vertical tabs, with contact always in view beside them. */
export function MarketingSupportOptionB() {
  return (
    <PublicFrame path="/support">
      <div className={`${PAGE} gap-10 py-16`}>
        <MarketingPageHeader title="Support">
          Pick a topic. Answers open in place.
        </MarketingPageHeader>
        <div className="grid grid-cols-4 items-start gap-10">
          <Tabs defaultValue="sending" orientation="vertical" className="col-span-3">
            <div className="grid grid-cols-3 gap-8">
              <TabsList>
                {TOPICS.map((t) => (
                  <TabsTrigger key={t.value} value={t.value}>
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="col-span-2">
                {TOPICS.map((t) => (
                  <TabsContent key={t.value} value={t.value}>
                    <Faq entries={t.entries} />
                  </TabsContent>
                ))}
              </div>
            </div>
          </Tabs>
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <EnvelopeSimpleIcon weight="duotone" aria-hidden />
                  Still stuck?
                </span>
              </CardTitle>
              <CardDescription>Email us and say which session or card.</CardDescription>
            </CardHeader>
            <CardFooter>
              <a
                href={`mailto:${supportEmail}`}
                className={buttonVariants({ variant: "secondary" })}
              >
                Email support
              </a>
            </CardFooter>
          </Card>
        </div>
      </div>
    </PublicFrame>
  );
}

const STATUSES: { label: string; badge: BadgeProps; means: string; next: string }[] = [
  {
    label: "Queued",
    badge: { variant: "outline" },
    means: "The session arrived and waits its turn.",
    next: "Nothing. The dashboard updates without a reload.",
  },
  {
    label: "Making cards",
    badge: { variant: "default" },
    means: "One model call is turning the session into up to 5 cards.",
    next: "Wait. Quotes are checked before you see anything.",
  },
  {
    label: "Cards ready",
    badge: { variant: "success" },
    means:
      "Every quote was checked against the session. Cards are on your dashboard; one whose quote didn't match is flagged.",
    next: "Answer them on their review day: 1, 4 or 11.",
  },
  {
    label: "Failed",
    badge: { status: "fail" },
    means: "Something went wrong. The session page says what.",
    next: PROBLEMS[0].next,
  },
];

const SCORES: { score: Score; means: string }[] = [
  { score: 2, means: "The card moves to its next review day. On day 11, you own it." },
  { score: 1, means: "One step down (never below day 1), back tomorrow." },
  {
    score: 0,
    means: "One step down, back tomorrow. “I don’t know yet” scores 0 but keeps its step.",
  },
];

/** C: a glossary of every badge you'll meet, each with what it means and what to do. Support as reading the UI. */
export function MarketingSupportOptionC() {
  return (
    <PublicFrame path="/support">
      <div className={`${PAGE} gap-12 py-16`}>
        <MarketingPageHeader title="Read the badges">
          Most questions are a badge on your screen. Find yours: here is what it means and what to
          do next.
        </MarketingPageHeader>
        <div className="grid grid-cols-2 items-start gap-12">
          <section aria-labelledby="opt-support-c-sessions" className="flex flex-col gap-4">
            <h2 id="opt-support-c-sessions" className="type-label text-text-1">
              On a session
            </h2>
            <ItemGroup>
              {STATUSES.map((s) => (
                <Item key={s.label} variant="outline">
                  <ItemContent>
                    <ItemTitle>
                      <Badge {...s.badge}>{s.label}</Badge>
                    </ItemTitle>
                    <ItemDescription>
                      {s.means} {s.next}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          </section>
          <section aria-labelledby="opt-support-c-scores" className="flex flex-col gap-4">
            <h2 id="opt-support-c-scores" className="type-label text-text-1">
              On an answer
            </h2>
            <ItemGroup>
              {SCORES.map((s) => (
                <Item key={s.score} variant="outline">
                  <ItemContent>
                    <ItemTitle>
                      <ScoreBadge score={s.score} />
                    </ItemTitle>
                    <ItemDescription>{s.means}</ItemDescription>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
            <h2 className="pt-4 type-label text-text-1">On a card</h2>
            <KindList />
          </section>
        </div>
        <p className="flex items-center gap-2 type-body-sm text-text-2">
          <EnvelopeSimpleIcon aria-hidden />
          A badge not here? Email{" "}
          <a href={`mailto:${supportEmail}`} className="text-text-1 underline">
            {supportEmail}
          </a>
        </p>
      </div>
    </PublicFrame>
  );
}
