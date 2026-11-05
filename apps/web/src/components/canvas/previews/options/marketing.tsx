"use client";

// The picked options for the public pages: /how-it-works B and /pricing C. Every option teaches on the
// page itself: what a decision card is, why you answer before the why shows, what day 1, 4 and 11 mean, what explained
// and owned mean, and what to do next. All data is synthetic. The sample card's why stays hidden until it is answered.

import {
  ArrowsClockwiseIcon,
  CardsIcon,
  CloudArrowUpIcon,
  EyeSlashIcon,
  FlagIcon,
  LightbulbIcon,
  MagnifyingGlassIcon,
  QuotesIcon,
  TerminalWindowIcon,
  type Icon,
} from "@phosphor-icons/react";
import Link from "next/link";

import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { PublicFrame } from "../frames";
import { Terminal } from "../parts";

const PAGE = "mx-auto flex w-full max-w-(--container) flex-col px-(--gutter-sm) sm:px-(--gutter)";

const LOGIN = "npx session-coach login";
const PUSH = "npx session-coach push --latest";

// ---------------------------------------------------------------------------------------------------------------
// Shared teaching pieces
// ---------------------------------------------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------------------------------------------
// /pricing
// ---------------------------------------------------------------------------------------------------------------

const TRIAL = "Free during the 8x Playmakers trial, 28 Oct to 6 Nov 2026.";
const NO_CHARGE = "No card needed, and we won’t charge you without asking first.";

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
