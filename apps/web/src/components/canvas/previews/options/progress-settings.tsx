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
