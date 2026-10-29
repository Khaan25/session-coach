"use client";

import { Fragment } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMeta,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Status } from "@/components/ui/status";
import { Switch } from "@/components/ui/switch";

import { cards, REVIEW_DAYS, session } from "../sample";

const PREFERENCES = [
  {
    id: "notify-review",
    label: "Review reminders",
    description: "An email on day 1, 3 and 7 after a session ends.",
    defaultChecked: true,
  },
  {
    id: "notify-cards",
    label: "Cards ready",
    description: "When a session's decision cards are written.",
    defaultChecked: true,
  },
  { id: "notify-digest", label: "TODO(zia)", description: "TODO(zia)", defaultChecked: false },
];

/** Preference list: label and description at the start, the switch at the end; the whole row toggles it. */
function ReviewPrefsBlock() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>When Session Coach emails you.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          {PREFERENCES.map((preference, index) => (
            <Fragment key={preference.id}>
              {index > 0 && <FieldSeparator />}
              <Field orientation="horizontal" className="relative">
                <FieldContent>
                  <FieldLabel htmlFor={preference.id} className="after:absolute after:inset-0">
                    {preference.label}
                  </FieldLabel>
                  <FieldDescription>{preference.description}</FieldDescription>
                </FieldContent>
                <Switch
                  id={preference.id}
                  defaultChecked={preference.defaultChecked}
                  className="relative"
                />
              </Field>
            </Fragment>
          ))}
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

// The zip's activity list, rebuilt as Item rows: its icon tiles are an anti-slop pattern in the design system, and its
// tile colour is a token now (the zip's one raw value is gone with the tile).
const ACTIVITY = [
  { title: session.title, detail: `Session ended, ${session.duration_min} min`, time: "Oct 27" },
  { title: `${cards.length} decision cards`, detail: "Written from the session", time: "Oct 27" },
  { title: cards[0].decision, detail: "Explained back on day 1", time: "Oct 28" },
  { title: cards[2].decision, detail: "Flagged: one quote did not match", time: "Oct 28" },
];

/** Activity list: two-line rows with a trailing date, split by row rules. */
function RecentActivityBlock() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Your latest sessions and reviews.</CardDescription>
      </CardHeader>
      <ItemGroup>
        {ACTIVITY.map(({ title, detail, time }, index) => (
          <Fragment key={title}>
            {index > 0 && <ItemSeparator />}
            <Item>
              <ItemContent>
                <ItemTitle>{title}</ItemTitle>
                <ItemDescription>{detail}</ItemDescription>
              </ItemContent>
              <ItemMeta>{time}</ItemMeta>
            </Item>
          </Fragment>
        ))}
      </ItemGroup>
    </Card>
  );
}

/** Progress: the overall review meter, the three review days behind it, and one in trouble. */
function ReviewProgressBlock() {
  const steps = [
    { day: REVIEW_DAYS[0], value: 100, status: "ok" as const },
    { day: REVIEW_DAYS[1], value: 50, status: "running" as const },
    { day: REVIEW_DAYS[2], value: 0, status: "queued" as const },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Review schedule</CardTitle>
        <CardDescription>{session.title}</CardDescription>
      </CardHeader>
      <CardContent>
        <Progress value={50}>
          <ProgressLabel>Overall</ProgressLabel>
          <ProgressValue />
        </Progress>
        {steps.map((step) => (
          <Progress key={step.day} value={step.value}>
            <ProgressLabel>Day {step.day}</ProgressLabel>
            <Status status={step.status} className="ms-auto" />
          </Progress>
        ))}
        <Progress value={30} data-status="fail">
          <ProgressLabel>{cards[2].decision}</ProgressLabel>
          <ProgressValue />
        </Progress>
        <Badge status="fail" label="Unverified quote" />
      </CardContent>
    </Card>
  );
}

/** The loading twin of the activity list: same row geometry, so nothing jumps when the data lands. */
function ActivityLoadingBlock() {
  return (
    <Card aria-busy="true">
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            Writing cards
            <Spinner className="size-3" />
          </span>
        </CardTitle>
        <CardDescription>Reading {session.event_count} events.</CardDescription>
      </CardHeader>
      <ItemGroup>
        {[0, 1, 2, 3].map((row) => (
          <Item key={row}>
            <ItemContent>
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-56" />
            </ItemContent>
            <Skeleton className="h-3 w-12" />
          </Item>
        ))}
      </ItemGroup>
    </Card>
  );
}

export { ActivityLoadingBlock, RecentActivityBlock, ReviewPrefsBlock, ReviewProgressBlock };
