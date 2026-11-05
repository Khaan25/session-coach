"use client";

// Redesign options for /progress and /settings: three layouts per route, each one teaching on the page what a card,
// the schedule, explained and owned, and each setting mean, and what to do next. Synthetic data only; the questions
// shown are the generic level examples from lib/projects/level.ts, never a card's answer key.

import { CalendarCheckIcon, LaptopIcon, SealCheckIcon } from "@phosphor-icons/react";
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
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Stat, StatDescription, StatGroup, StatLabel, StatValue } from "@/components/ui/stat";
import { Switch } from "@/components/ui/switch";

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

const ANSWERS = Array.from({ length: 30 }, (_, i) => ({
  // Oct 5 to Nov 3, ending on the canvas's NOW.
  day: i < 27 ? `Oct ${i + 5}` : `Nov ${i - 26}`,
  answers: [3, 0, 2, 4, 1, 5, 2][i % 7],
}));

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

export function ProgressSettingsSettingsOptionA({
  id = "opt-settings-a",
  overlay,
}: {
  /** Prefix for the field ids, unique per copy on the canvas. */
  id?: string;
  /** Drawn over the window, such as the delete dialog or the saved toast. */
  overlay?: React.ReactNode;
} = {}) {
  return (
    <AppFrame path="/settings" overlay={overlay}>
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
