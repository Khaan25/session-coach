"use client";

// Redesign options for /progress and /settings: three layouts per route, each one teaching on the page what a card,
// the schedule, explained and owned, and each setting mean, and what to do next. Synthetic data only; the questions
// shown are the generic level examples from lib/projects/level.ts, never a card's answer key.

import {
  CalendarCheckIcon,
  LaptopIcon,
  QuestionIcon,
  SealCheckIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import type { QuestionLevel } from "@session-coach/shared/project";
import Link from "next/link";
import { useState } from "react";

import { Container } from "@/components/app/container";
import { AppPageHeader } from "@/components/app/page-header";
import { ScoreBadge, type Score } from "@/components/app/score-badge";
import { AnswersChart } from "@/components/progress/answers-chart";
import { LevelPicker } from "@/components/projects/level-picker";
import { SettingsCard } from "@/components/settings/settings-card";
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
import { Collapsible, CollapsibleContent, CollapsibleRow } from "@/components/ui/collapsible";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { Separator } from "@/components/ui/separator";
import { Stat, StatDescription, StatGroup, StatLabel, StatValue } from "@/components/ui/stat";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QUESTION_LEVEL_OPTIONS } from "@/lib/projects/level";

import { AppFrame, FRAME_SESSIONS, FRAME_USER } from "../frames";
import { IdeaNote } from "../parts";

// ---------------------------------------------------------------------------------------------------------------
// Shared synthetic data. One learner, 39 visible cards; the numbers add up across every option.
// ---------------------------------------------------------------------------------------------------------------

const TOTAL = 39;
const OWNED = 17;
/** Answered Explained at least once. */
const EXPLAINED = 30;
/** Owned, plus cards explained in the last 7 days. */
const CAN_STILL_EXPLAIN = 22;
const DUE_TODAY = 3;

/** The schedule in order, with what each step means in a sentence. Day 7 is never a step: reviews are 1, 4, 11. */
const STEPS = [
  {
    label: "New",
    count: 6,
    means: "Made from a session. Not answered yet.",
    next: "Answer it once to start its schedule.",
  },
  {
    label: "Day 1",
    count: 5,
    means: "Answered once, or sent back by a miss.",
    next: "Comes back the next day.",
  },
  {
    label: "Day 4",
    count: 7,
    means: "Explained on day 1.",
    next: "Comes back 3 days later.",
  },
  {
    label: "Day 11",
    count: 4,
    means: "Explained on day 4.",
    next: "Comes back 7 days later.",
  },
  {
    label: "Owned",
    count: OWNED,
    means: "Explained again on day 11.",
    next: "You can explain this decision without help.",
  },
];

const MISS_RULE =
  "Partly or Missed moves a card one step back, never below day 1, and it comes back tomorrow.";

const ANSWERS = Array.from({ length: 30 }, (_, i) => ({
  // Oct 5 to Nov 3, ending on the canvas's NOW.
  day: i < 27 ? `Oct ${i + 5}` : `Nov ${i - 26}`,
  answers: [3, 0, 2, 4, 1, 5, 2][i % 7],
}));
const SCORE_MIX: Record<Score, number> = { 2: 44, 1: 20, 0: 7 };
const SCORES: Score[] = [2, 1, 0];
const ANSWERED = SCORES.reduce<number>((sum, score) => sum + SCORE_MIX[score], 0);

const BY_SESSION = [
  // Only ready sessions have cards; these add up to TOTAL (39) and OWNED (17).
  { id: FRAME_SESSIONS[0].id, title: FRAME_SESSIONS[0].title, owned: 10, total: 22 },
  { id: FRAME_SESSIONS[3].id, title: FRAME_SESSIONS[3].title, owned: 7, total: 17 },
];

const pct = (n: number, of: number) => Math.round((n / of) * 100);

const REVIEW_LINK = buttonVariants({ variant: "default" });

/** Explained and owned as two bars, each with its definition under it. */
function ExplainedOwnedBars() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Progress value={pct(EXPLAINED, TOTAL)}>
          <ProgressLabel>Explained</ProgressLabel>
          <ProgressValue>{() => `${EXPLAINED} of ${TOTAL}`}</ProgressValue>
        </Progress>
        <p className="type-body-sm text-text-2">
          You answered it in your own words and the grader scored it Explained, at least once.
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <Progress value={pct(OWNED, TOTAL)}>
          <ProgressLabel>Owned</ProgressLabel>
          <ProgressValue>{() => `${OWNED} of ${TOTAL}`}</ProgressValue>
        </Progress>
        <p className="type-body-sm text-text-2">
          You still explained it on day 11, after three spaced reviews. That is the goal for every
          card.
        </p>
      </div>
    </div>
  );
}

function ScoreMixBars() {
  return (
    <div className="flex flex-col gap-3">
      {SCORES.map((score) => (
        <Progress key={score} value={pct(SCORE_MIX[score], ANSWERED)}>
          <ProgressLabel>
            <ScoreBadge score={score} /> {SCORE_MIX[score]} answers
          </ProgressLabel>
          <ProgressValue />
        </Progress>
      ))}
    </div>
  );
}

function BySessionList() {
  return (
    <ItemGroup aria-label="Cards by session">
      {BY_SESSION.map(({ id, title, owned, total }) => (
        // ItemGroup is a div with role="list", so the row takes the matching role.
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        <Item key={id} role="listitem">
          <ItemContent>
            <ItemTitle>
              <Link href={`/s/${id}`}>{title}</Link>
            </ItemTitle>
            <ItemDescription>
              {owned} of {total} cards owned
            </ItemDescription>
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Progress · A · Guided ladder: the next steps first, then the schedule drawn as a ladder with each rung explained.
// ---------------------------------------------------------------------------------------------------------------

const NEXT_STEPS = [
  {
    title: `Explain the ${DUE_TODAY} cards due today`,
    why: "One is on its day 11 review. Explain it and you own it.",
    action: (
      <Link href="/review" className={REVIEW_LINK}>
        Start review
      </Link>
    ),
    badge: `${DUE_TODAY} due`,
  },
  {
    title: "Your 6 new cards join the queue",
    why: "Review holds at most 5 cards a day, up to 2 of them new. Your first answer puts a card on day 1.",
    action: null,
    badge: "6 new",
  },
  {
    title: "Come back tomorrow",
    why: "2 more cards come due. With email reminders on, you get an email on days cards are due.",
    action: null,
    badge: "Tomorrow",
  },
];

export function ProgressSettingsProgressOptionA() {
  return (
    <AppFrame path="/progress">
      <Container>
        <AppPageHeader
          title="Progress"
          description="Every decision card climbs the same ladder. This page shows where yours are and what to do next."
        >
          <PageHeaderStats>
            <PageHeaderStat
              label="Decisions you can still explain"
              value={CAN_STILL_EXPLAIN}
              detail={`of ${TOTAL} cards: owned, or explained in the last 7 days`}
            />
            <PageHeaderStat label="Owned" value={OWNED} detail="explained on day 11" />
          </PageHeaderStats>
        </AppPageHeader>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Your next steps</h2>
            </CardTitle>
            <CardDescription>
              In order. The first one is the one that moves the numbers.
            </CardDescription>
          </CardHeader>
          <ol className="flex flex-col">
            {NEXT_STEPS.map((step, i) => (
              <li key={step.title}>
                <Item>
                  <ItemMedia variant="icon">
                    <span className="type-label tabular-nums">{i + 1}</span>
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>
                      {step.title} <Badge variant="outline">{step.badge}</Badge>
                    </ItemTitle>
                    <ItemDescription>{step.why}</ItemDescription>
                  </ItemContent>
                  {step.action && <ItemActions>{step.action}</ItemActions>}
                </Item>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>The ladder: where your {TOTAL} cards sit</h2>
            </CardTitle>
            <CardDescription>
              A decision card is one choice your agent made in a session, with the evidence for it.
              You explain the why before you see it, because recalling it is what makes it stick.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="grid grid-cols-5 gap-3">
              {STEPS.map((step) => (
                <li key={step.label}>
                  <Stat variant="framed">
                    <StatLabel>{step.label}</StatLabel>
                    <StatValue>{step.count}</StatValue>
                    <StatDescription>
                      {step.means} {step.next}
                    </StatDescription>
                  </Stat>
                </li>
              ))}
            </ol>
          </CardContent>
          <CardFooter>
            <p className="type-body-sm text-text-2">{MISS_RULE}</p>
          </CardFooter>
        </Card>

        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Explained vs owned</h2>
              </CardTitle>
              <CardDescription>Explaining once is the start. Owning is the finish.</CardDescription>
            </CardHeader>
            <CardContent>
              <ExplainedOwnedBars />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Answers per day</h2>
              </CardTitle>
              <CardDescription>
                Each bar is the answers you gave that day, over the last 30 days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnswersChart data={ANSWERS} />
            </CardContent>
          </Card>
        </div>
        <IdeaNote>
          Next steps come first and the schedule is a ladder whose rungs say what they mean, so a
          newcomer learns the model from their own numbers.
        </IdeaNote>
      </Container>
    </AppFrame>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Progress · B · Explain as you go: the data on the left, a guide on the right that explains whichever block you ask.
// ---------------------------------------------------------------------------------------------------------------

type Topic = "headline" | "steps" | "ownership" | "answers" | "scores";

const GUIDE: Record<Topic, { title: string; body: string[]; next: string }> = {
  headline: {
    title: "Decisions you can still explain",
    body: [
      `Owned cards plus cards you explained in the last 7 days, each counted once: ${CAN_STILL_EXPLAIN} of ${TOTAL}.`,
      "It drops when you stop reviewing, because an explanation from weeks ago is not proof you still have it.",
    ],
    next: `Explain the ${DUE_TODAY} cards due today to keep it up.`,
  },
  steps: {
    title: "Cards by step",
    body: [
      "Each card comes back on day 1, day 4 and day 11 after you first answer it. The gaps grow because recall gets stronger each time.",
      "You write the why before you see it. Trying to recall is the practice; reading the answer first would skip it.",
      MISS_RULE,
    ],
    next: "Review adds up to 2 new cards a day. Your first answer puts each one on day 1.",
  },
  ownership: {
    title: "Explained vs owned",
    body: [
      "Explained: the grader scored one of your answers Explained (2 of 2).",
      "Owned: you explained it again on its day 11 review, after three spaced reviews. It leaves the schedule; it's yours.",
    ],
    next: "4 cards are on day 11. Each one you explain becomes owned.",
  },
  answers: {
    title: "Answers per day",
    body: [
      "How many cards you answered each day, over 30 days. Gaps are days you skipped.",
      "A due card stays due until you answer it, and Review takes at most 5 a day, so skipped days build a backlog.",
    ],
    next: "A short review each day keeps the backlog at zero.",
  },
  scores: {
    title: "Score mix",
    body: [
      "Explained (2): the why, in your words. Partly (1): close, a piece missing. Missed (0): not yet.",
      "A lot of Partly usually means the answers are too short. Name the trade-off, not only the choice.",
    ],
    next: "Read the model answer after each Partly before you move on.",
  },
};

/** One block on the left: its heading, a button that opens its explanation on the right, then its content. */
function ExplainedBlock({
  topic,
  selected,
  onExplain,
  children,
}: {
  topic: Topic;
  selected: boolean;
  onExplain: (topic: Topic) => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{GUIDE[topic].title}</h2>
        </CardTitle>
        <CardAction>
          <Button
            variant={selected ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={selected}
            onClick={() => onExplain(topic)}
          >
            <QuestionIcon data-icon="inline-start" aria-hidden />
            What is this?
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function ProgressSettingsProgressOptionB() {
  const [topic, setTopic] = useState<Topic>("steps");
  const guide = GUIDE[topic];
  return (
    <AppFrame path="/progress">
      <Container>
        <AppPageHeader
          title="Progress"
          description="Press What is this? on any block. The guide on the right explains it with your numbers."
        />
        <div className="grid grid-cols-3 items-start gap-6">
          <div className="col-span-2 flex flex-col gap-6">
            <ExplainedBlock topic="headline" selected={topic === "headline"} onExplain={setTopic}>
              <StatGroup variant="plain">
                <Stat>
                  <StatLabel>Can still explain</StatLabel>
                  <StatValue>{CAN_STILL_EXPLAIN}</StatValue>
                  <StatDescription>of {TOTAL} cards</StatDescription>
                </Stat>
                <Stat>
                  <StatLabel>Due today</StatLabel>
                  <StatValue>{DUE_TODAY}</StatValue>
                  <StatDescription>at most 5 a day</StatDescription>
                </Stat>
              </StatGroup>
            </ExplainedBlock>
            <ExplainedBlock topic="steps" selected={topic === "steps"} onExplain={setTopic}>
              <StatGroup variant="plain">
                {STEPS.map(({ label, count }) => (
                  <Stat key={label}>
                    <StatLabel>{label}</StatLabel>
                    <StatValue>{count}</StatValue>
                  </Stat>
                ))}
              </StatGroup>
            </ExplainedBlock>
            <ExplainedBlock topic="ownership" selected={topic === "ownership"} onExplain={setTopic}>
              <ExplainedOwnedBars />
            </ExplainedBlock>
            <div className="grid grid-cols-2 gap-6">
              <ExplainedBlock topic="answers" selected={topic === "answers"} onExplain={setTopic}>
                <AnswersChart data={ANSWERS} />
              </ExplainedBlock>
              <ExplainedBlock topic="scores" selected={topic === "scores"} onExplain={setTopic}>
                <ScoreMixBars />
              </ExplainedBlock>
            </div>
          </div>
          <aside aria-label="Guide" className="sticky top-16">
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>{guide.title}</h2>
                </CardTitle>
                <CardDescription>Guide</CardDescription>
              </CardHeader>
              <CardContent>
                <div aria-live="polite" className="flex flex-col gap-3">
                  {guide.body.map((line) => (
                    <p key={line} className="type-body text-text-2">
                      {line}
                    </p>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <div className="flex flex-col gap-3">
                  <p className="type-label text-text-1">{guide.next}</p>
                  <Link href="/review" className={REVIEW_LINK}>
                    Start review
                  </Link>
                </div>
              </CardFooter>
            </Card>
          </aside>
        </div>
        <IdeaNote>
          The explanation sits next to the number it explains and changes as the learner points at
          blocks, so the page needs no glossary or docs link.
        </IdeaNote>
      </Container>
    </AppFrame>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Progress · C · Follow one card: one task up top, then the schedule taught by one card's real path, numbers folded.
// ---------------------------------------------------------------------------------------------------------------

/** One card's path through the schedule. The decision's title only; its why stays hidden until it is answered. */
const JOURNEY: { date: string; what: string; score?: Score; step: string; outcome: string }[] = [
  {
    date: "Oct 23",
    what: "Made from your session",
    step: "New",
    outcome: "Waiting for your first answer.",
  },
  {
    date: "Oct 23",
    what: "First answer",
    score: 1,
    step: "Day 1",
    outcome: "Partly, so it starts on day 1: due Oct 24.",
  },
  {
    date: "Oct 24",
    what: "Day 1 review",
    score: 2,
    step: "Day 4",
    outcome: "Explained, so it moves up: due 3 days later, Oct 27.",
  },
  {
    date: "Oct 27",
    what: "Day 4 review",
    score: 2,
    step: "Day 11",
    outcome: "Explained again: due 7 days later, today.",
  },
];

export function ProgressSettingsProgressOptionC() {
  return (
    <AppFrame path="/progress">
      <Container>
        <AppPageHeader title="Progress" description="One thing to do today, and why it matters." />

        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="flex items-center gap-2">
                <CalendarCheckIcon aria-hidden />
                {DUE_TODAY} cards are due today
              </h2>
            </CardTitle>
            <CardDescription>
              One of them is on its day 11 review: explain it and you own it.
            </CardDescription>
            <CardAction>
              <Link href="/review" className={REVIEW_LINK}>
                Start review
              </Link>
            </CardAction>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>How a card becomes yours</h2>
            </CardTitle>
            <CardDescription>
              Follow one of your cards: &ldquo;Rate limit uploads per CLI token&rdquo;, from &ldquo;
              {FRAME_SESSIONS[0].title}&rdquo;. Each time, you wrote the why first and only then saw
              the model answer.
            </CardDescription>
          </CardHeader>
          <ol aria-label="One card's reviews">
            {JOURNEY.map((stop) => (
              <li key={`${stop.date}-${stop.what}`}>
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
              <Item selected>
                <ItemMedia variant="icon">
                  <SealCheckIcon aria-hidden />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Today · Day 11 review</ItemTitle>
                  <ItemDescription>
                    Explain it now and it becomes owned. Partly or Missed sends it back to day 4,
                    due tomorrow.
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Link
                    href="/review"
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                  >
                    Review it
                  </Link>
                </ItemActions>
              </Item>
            </li>
          </ol>
        </Card>

        <Card>
          <CardContent>
            <Collapsible>
              <CollapsibleRow
                size="row"
                summary={`${TOTAL} cards · ${EXPLAINED} explained · ${OWNED} owned`}
              >
                All your cards
              </CollapsibleRow>
              <CollapsibleContent>
                <div className="flex flex-col gap-6 pt-4">
                  <StatGroup variant="plain">
                    {STEPS.map(({ label, count, means }) => (
                      <Stat key={label}>
                        <StatLabel>{label}</StatLabel>
                        <StatValue>{count}</StatValue>
                        <StatDescription>{means}</StatDescription>
                      </Stat>
                    ))}
                  </StatGroup>
                  <ExplainedOwnedBars />
                  <AnswersChart data={ANSWERS} />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>By session</h2>
            </CardTitle>
          </CardHeader>
          <BySessionList />
        </Card>
        <IdeaNote>
          The schedule is taught by one real card&rsquo;s dates and scores instead of a diagram; the
          totals fold away until the learner wants them.
        </IdeaNote>
      </Container>
    </AppFrame>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Settings data
// ---------------------------------------------------------------------------------------------------------------

const TIMEZONES = ["Asia/Karachi", "Europe/London", "America/New_York", "UTC"];

const PROJECTS: { repo: string; level: QuestionLevel }[] = [
  { repo: "session-coach", level: "hard" },
  { repo: "rapporteur", level: "simple" },
];

const DEVICES = [
  { name: "MacBook Pro", version: "session-coach 0.2.0", used: "Last push 12 minutes ago" },
  { name: "Work desktop", version: "session-coach 0.1.1", used: "Last push 6 days ago" },
];

const LEVEL_SCOPE =
  "Applies to sessions processed after the change. Cards you already have keep their questions.";

const REMINDER_RULE = "An email on days when cards are due. Nothing on days with none.";

const DEVICE_RULE =
  "Each device is the CLI token it signed in with. Disconnect revokes that token: the computer can't push until you run npx session-coach login there again.";

/** What delete removes, in counts, so the learner sees the cost before the button. */
const DELETES = [
  { label: "Sessions", value: "4 sessions and their uploaded logs" },
  { label: "Decision cards", value: `${TOTAL} cards, ${OWNED} of them owned` },
  { label: "Answers", value: `${ANSWERED} answers and their scores` },
  { label: "CLI tokens", value: `${DEVICES.length} devices, revoked so they can't push` },
];

function TimeZoneBox({
  id,
  value,
  onValueChange,
}: {
  id: string;
  value?: string;
  onValueChange?: (zone: string) => void;
}) {
  return (
    <Combobox
      items={TIMEZONES}
      {...(value === undefined ? { defaultValue: "Asia/Karachi" } : { value })}
      onValueChange={(next) => {
        if (typeof next === "string") onValueChange?.(next);
      }}
    >
      <ComboboxInput id={id} placeholder="Find a time zone" />
      <ComboboxContent>
        <ComboboxEmpty>No time zones match.</ComboboxEmpty>
        <ComboboxList>
          {(zone: string) => (
            <ComboboxItem key={zone} value={zone}>
              {zone}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

/** A repo's level picker that keeps its own value on the canvas; the real one saves through a Server Action. */
function LocalLevel({
  repo,
  level,
  onChange,
}: {
  repo: string;
  level: QuestionLevel;
  onChange?: (level: QuestionLevel) => void;
}) {
  const [value, setValue] = useState(level);
  return (
    <LevelPicker
      label={repo}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

function DeviceRows() {
  return (
    <ItemGroup aria-label="Connected devices">
      {DEVICES.map((d) => (
        // ItemGroup is a div with role="list", so the row takes the matching role.
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        <Item key={d.name} role="listitem">
          <ItemMedia variant="icon">
            <LaptopIcon aria-hidden />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>
              {d.name} · {d.version}
            </ItemTitle>
            <ItemDescription>{d.used}</ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button variant="secondary" size="sm">
              Disconnect
            </Button>
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Settings · A · Guided checklist: five numbered steps, each with what it changes; the account actions apart at the end.
// ---------------------------------------------------------------------------------------------------------------

function ChecklistStep({
  n,
  title,
  changes,
  done,
  children,
}: {
  n: number;
  title: string;
  changes: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="grid grid-cols-12 gap-6">
      <div className="col-span-4 flex gap-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-well type-label tabular-nums">
          {n}
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 type-heading-xs text-text-1">
            {title}
            <Badge variant={done ? "success" : "outline"}>{done ? "Set" : "Check this"}</Badge>
          </h2>
          <p className="type-body-sm text-text-2">{changes}</p>
        </div>
      </div>
      <div className="col-span-8">
        <Card>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </li>
  );
}

export function ProgressSettingsSettingsOptionA() {
  const id = "opt-settings-a";
  return (
    <AppFrame path="/settings">
      <Container>
        <AppPageHeader
          title="Settings"
          description="Five things to check once. Each says what it changes in your reviews."
        />
        <ol className="flex flex-col gap-8">
          <ChecklistStep n={1} title="Your name" changes="Shown in your account menu." done>
            <Field>
              <FieldLabel htmlFor={`${id}-name`}>Display name</FieldLabel>
              <Input id={`${id}-name`} defaultValue={FRAME_USER.name} />
              <FieldDescription>Email: {FRAME_USER.detail}, from how you sign in.</FieldDescription>
            </Field>
          </ChecklistStep>
          <ChecklistStep
            n={2}
            title="Time zone"
            changes="Your day starts at midnight here, so it decides which day a card is due."
            done
          >
            <Field>
              <FieldLabel htmlFor={`${id}-tz`}>Time zone</FieldLabel>
              <TimeZoneBox id={`${id}-tz`} />
            </Field>
          </ChecklistStep>
          <ChecklistStep
            n={3}
            title="Daily reminder"
            changes="Cards come back on day 1, 4 and 11. The email tells you when one is due."
            done
          >
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor={`${id}-notify`}>Email reminders</FieldLabel>
                <FieldDescription>{REMINDER_RULE}</FieldDescription>
              </FieldContent>
              <Switch id={`${id}-notify`} defaultChecked />
            </Field>
          </ChecklistStep>
          <ChecklistStep
            n={4}
            title="Question level per project"
            changes={LEVEL_SCOPE}
            done={false}
          >
            <FieldGroup>
              {PROJECTS.map((p) => (
                <LocalLevel key={p.repo} repo={p.repo} level={p.level} />
              ))}
            </FieldGroup>
          </ChecklistStep>
          <ChecklistStep n={5} title="Devices" changes={DEVICE_RULE} done>
            <DeviceRows />
          </ChecklistStep>
        </ol>
        <Separator />
        <h2 className="type-heading-sm text-text-1">Account</h2>
        <SettingsCard
          title="Sign out everywhere"
          description="Signs you out on every browser and device, including this one."
        >
          <Button variant="secondary" size="sm">
            Sign out everywhere
          </Button>
        </SettingsCard>
        <SettingsCard
          title="Delete account"
          description="Deletes your sessions, cards, answers and tokens. It can't be undone."
        >
          <Button variant="destructive">Delete account</Button>
        </SettingsCard>
        <IdeaNote>
          Settings read as a numbered setup list: each step says what it changes in the learning
          loop, and the account actions sit apart so nothing destructive is mid-list.
        </IdeaNote>
      </Container>
    </AppFrame>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Settings · B · Explain as you go: the form on the left, a live preview on the right of what each choice does.
// ---------------------------------------------------------------------------------------------------------------

export function ProgressSettingsSettingsOptionB() {
  const id = "opt-settings-b";
  const [zone, setZone] = useState("Asia/Karachi");
  const [notify, setNotify] = useState(true);
  const [focus, setFocus] = useState<{ repo: string; level: QuestionLevel }>(PROJECTS[0]);
  const example = QUESTION_LEVEL_OPTIONS.find((o) => o.value === focus.level);
  return (
    <AppFrame path="/settings">
      <Container>
        <AppPageHeader
          title="Settings"
          description="Change something on the left. The right side shows what it does to your reviews."
        />
        <div className="grid grid-cols-5 items-start gap-6">
          <div className="col-span-3 flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>Profile and reminders</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={`${id}-name`}>Display name</FieldLabel>
                    <Input id={`${id}-name`} defaultValue={FRAME_USER.name} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${id}-tz`}>Time zone</FieldLabel>
                    <TimeZoneBox id={`${id}-tz`} value={zone} onValueChange={setZone} />
                  </Field>
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldLabel htmlFor={`${id}-notify`}>Email reminders</FieldLabel>
                    </FieldContent>
                    <Switch id={`${id}-notify`} checked={notify} onCheckedChange={setNotify} />
                  </Field>
                </FieldGroup>
              </CardContent>
              <CardFooter>
                <Button>Save profile</Button>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>Question level</h2>
                </CardTitle>
                <CardDescription>{LEVEL_SCOPE}</CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  {PROJECTS.map((p) => (
                    <LocalLevel
                      key={p.repo}
                      repo={p.repo}
                      level={p.level}
                      onChange={(level) => setFocus({ repo: p.repo, level })}
                    />
                  ))}
                </FieldGroup>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>Devices</h2>
                </CardTitle>
                <CardDescription>{DEVICE_RULE}</CardDescription>
              </CardHeader>
              <DeviceRows />
            </Card>
            <SettingsCard
              title="Delete account"
              description="Deletes your sessions, cards, answers and tokens. It can't be undone."
            >
              <Button variant="destructive">Delete account</Button>
            </SettingsCard>
          </div>

          <aside
            aria-label="What this changes"
            className="sticky top-16 col-span-2 flex flex-col gap-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>Your day</h2>
                </CardTitle>
                <CardDescription>From your time zone and reminder.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataList aria-live="polite">
                  <DataListItem>
                    <DataListLabel>New day starts</DataListLabel>
                    <DataListValue>Midnight, {zone}</DataListValue>
                  </DataListItem>
                  <DataListItem>
                    <DataListLabel>Cards due today</DataListLabel>
                    <DataListValue>{DUE_TODAY}, waiting in Review until you answer</DataListValue>
                  </DataListItem>
                  <DataListItem>
                    <DataListLabel>Daily limit</DataListLabel>
                    <DataListValue>5 cards a day, up to 2 of them new</DataListValue>
                  </DataListItem>
                  <DataListItem>
                    <DataListLabel>Reminder</DataListLabel>
                    <DataListValue>
                      {notify
                        ? "An email on days when cards are due"
                        : "None. Open Review yourself."}
                    </DataListValue>
                  </DataListItem>
                </DataList>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>A {example?.label.toLowerCase()} question</h2>
                </CardTitle>
                <CardDescription>
                  What a new card from {focus.repo} would ask. You answer in your own words before
                  you see the model answer; recalling it is the practice.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p aria-live="polite" className="well p-4 type-body text-text-1">
                  {example?.example}
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
        <IdeaNote>
          Every choice shows its effect next to it: the time zone and reminder become the
          learner&rsquo;s day, and the level becomes a sample question.
        </IdeaNote>
      </Container>
    </AppFrame>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Settings · C · One task at a time: vertical tabs, each panel one job with its explanation; delete shows its cost.
// ---------------------------------------------------------------------------------------------------------------

export function ProgressSettingsSettingsOptionC() {
  const id = "opt-settings-c";
  const [confirm, setConfirm] = useState("");
  return (
    <AppFrame path="/settings">
      <Container>
        <AppPageHeader title="Settings" description="Pick one thing to change." />
        <Tabs defaultValue="questions" orientation="vertical">
          <TabsList variant="line" aria-label="Settings sections">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>Profile</h2>
                </CardTitle>
                <CardDescription>Who you are, and when your day starts.</CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={`${id}-name`}>Display name</FieldLabel>
                    <Input id={`${id}-name`} defaultValue={FRAME_USER.name} />
                    <FieldDescription>Shown in your account menu.</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${id}-tz`}>Time zone</FieldLabel>
                    <TimeZoneBox id={`${id}-tz`} />
                    <FieldDescription>
                      Cards fall due at midnight here, so day 1 is your tomorrow, not the
                      server&rsquo;s.
                    </FieldDescription>
                  </Field>
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldLabel htmlFor={`${id}-notify`}>Email reminders</FieldLabel>
                      <FieldDescription>{REMINDER_RULE}</FieldDescription>
                    </FieldContent>
                    <Switch id={`${id}-notify`} defaultChecked />
                  </Field>
                </FieldGroup>
              </CardContent>
              <CardFooter>
                <Button>Save profile</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="questions">
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>How hard your questions are</h2>
                </CardTitle>
                <CardDescription>
                  Each decision card asks you why your agent made one choice. The level sets how
                  deep that question goes, per project. {LEVEL_SCOPE}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-8">
                  <FieldGroup>
                    {PROJECTS.map((p) => (
                      <LocalLevel key={p.repo} repo={p.repo} level={p.level} />
                    ))}
                  </FieldGroup>
                  <ul aria-label="The three levels" className="flex flex-col gap-3">
                    {QUESTION_LEVEL_OPTIONS.map((o) => (
                      <li key={o.value}>
                        <Item variant="muted">
                          <ItemContent>
                            <ItemTitle>{o.label}</ItemTitle>
                            <ItemDescription>{o.example}</ItemDescription>
                          </ItemContent>
                        </Item>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
              <CardFooter>
                <p className="flex items-center gap-2 type-body-sm text-text-2">
                  <SparkleIcon aria-hidden />
                  New projects start on Simple. A suggestion: try Hard once most answers score
                  Explained.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="devices">
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>Devices</h2>
                </CardTitle>
                <CardDescription>
                  The computers that send your Claude Code sessions here. {DEVICE_RULE}
                </CardDescription>
              </CardHeader>
              <DeviceRows />
            </Card>
          </TabsContent>

          <TabsContent value="account">
            <div className="flex flex-col gap-6">
              <SettingsCard
                title="Sign out everywhere"
                description="Signs you out on every browser, including this one."
              >
                <Button variant="secondary" size="sm">
                  Sign out everywhere
                </Button>
              </SettingsCard>
              <Card>
                <CardHeader>
                  <CardTitle>
                    <h2>Delete account</h2>
                  </CardTitle>
                  <CardDescription>This removes, for good:</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-6">
                    <DataList>
                      {DELETES.map((row) => (
                        <DataListItem key={row.label}>
                          <DataListLabel>{row.label}</DataListLabel>
                          <DataListValue>{row.value}</DataListValue>
                        </DataListItem>
                      ))}
                    </DataList>
                    <Field>
                      <FieldLabel htmlFor={`${id}-confirm`}>
                        Type {FRAME_USER.detail} to confirm
                      </FieldLabel>
                      <Input
                        id={`${id}-confirm`}
                        type="email"
                        autoComplete="off"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                      />
                    </Field>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="destructive" disabled={confirm !== FRAME_USER.detail}>
                    Delete account
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        <IdeaNote>
          One section at a time, opened on the least obvious one: the question level explains what a
          decision card asks before asking the learner to pick.
        </IdeaNote>
      </Container>
    </AppFrame>
  );
}
