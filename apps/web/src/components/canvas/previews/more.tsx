"use client";

// Progress, the ownership report, settings, the daily email, and the flow maps that link the screens together.

import { ShieldCheckIcon } from "@phosphor-icons/react";

import { NoReviewsEmpty } from "@/components/app/empty-state";
import { StatRow } from "@/components/app/stat-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";

import { IdeaNote, Screen } from "./parts";

const STEPS = [
  { label: "New", count: 6 },
  { label: "Day 1", count: 5 },
  { label: "Day 3", count: 7 },
  { label: "Day 7", count: 4 },
  { label: "Owned", count: 17 },
];

export function ProgressPreview({ empty }: { empty?: boolean }) {
  return (
    <Screen path="/progress">
      <span className="type-heading">Progress</span>
      {empty ? (
        <NoReviewsEmpty />
      ) : (
        <>
          <StatRow cardsDueToday={3} sessionsThisWeek={4} explainedPercent={64} />
          <Card>
            <CardHeader>
              <CardTitle>Where your 39 cards are</CardTitle>
              <CardDescription>
                A miss sends a card back. Owned cards stay owned unless a defence fails.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {STEPS.map(({ label, count }) => (
                  <Progress key={label} value={Math.round((count / 39) * 100)}>
                    <ProgressLabel>{label}</ProgressLabel>
                    <ProgressValue>{() => String(count)}</ProgressValue>
                  </Progress>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </Screen>
  );
}

export function ReportPreview({ shared }: { shared: boolean }) {
  return (
    <Screen path={shared ? "/r/sam-rivera" : "/report"}>
      {shared ? (
        <>
          <div className="flex flex-col gap-1">
            <span className="type-heading">Sam Rivera owns 17 decisions</span>
            <span className="type-body-sm text-text-2">
              Shared by Sam · 2 repos · updated today
            </span>
          </div>
          {[
            { decision: "Rate limit uploads per CLI token, not per IP", defended: true },
            { decision: "Keep the newest events when a session is too long", defended: true },
            { decision: "Store CLI tokens hashed, show them once", defended: false },
          ].map((d) => (
            <Card key={d.decision}>
              <CardHeader>
                <CardTitle>{d.decision}</CardTitle>
                <CardDescription>
                  &ldquo;key it on the token so a shared office IP isn&rsquo;t blocked&rdquo;
                </CardDescription>
              </CardHeader>
              <CardFooter>
                {d.defended ? (
                  <Badge variant="success">
                    <ShieldCheckIcon aria-hidden="true" />
                    Defended (timed, follow-up)
                  </Badge>
                ) : (
                  <Badge variant="outline">Owned: explained on day 7</Badge>
                )}
              </CardFooter>
            </Card>
          ))}
          <IdeaNote>
            Shows decisions and their quotes only: never the answer key, hidden cards or raw logs.
          </IdeaNote>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your ownership report</CardTitle>
            <CardDescription>
              Off. Turn it on to get a link you can put on a CV or a PR. You choose which repos it
              shows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field orientation="horizontal">
              <Switch id="canvas-report-on" />
              <FieldLabel htmlFor="canvas-report-on">Share my report</FieldLabel>
            </Field>
          </CardContent>
        </Card>
      )}
    </Screen>
  );
}

export function SettingsPreview() {
  return (
    <Screen path="/settings">
      <span className="type-heading">Settings</span>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="canvas-name">Name</FieldLabel>
              <Input id="canvas-name" defaultValue="Sam Rivera" />
              <FieldDescription>The CLI and the report greet you with this.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="canvas-tz">Time zone</FieldLabel>
              <Input id="canvas-tz" defaultValue="Asia/Karachi" />
            </Field>
            <Field orientation="horizontal">
              <Switch id="canvas-mail" defaultChecked />
              <FieldLabel htmlFor="canvas-mail">Daily review email</FieldLabel>
            </Field>
          </div>
        </CardContent>
        <CardFooter>
          <Button>Save</Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Delete account</CardTitle>
          <CardDescription>
            Removes your sessions, cards, answers and logs. This can&rsquo;t be undone.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="destructive">Delete account</Button>
        </CardFooter>
      </Card>
    </Screen>
  );
}

export function EmailPreview() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1 border-b border-hair pb-3">
        <span className="type-label">Yesterday added 4 decisions. 3 are due today.</span>
        <span className="type-body-sm text-text-3">
          From Session Coach · to sam@example.com · 6:00 pm your time
        </span>
      </div>
      <span className="type-body">Hi Sam,</span>
      <span className="type-body">
        Yesterday&rsquo;s session &ldquo;Add rate limiting to the upload route&rdquo; gave you 4 new
        decisions. 3 cards are due today. About 2 minutes.
      </span>
      <Button>Start today&rsquo;s review</Button>
      <span className="type-body-sm text-text-3">
        You&rsquo;re on 5 of the last 7 days. Unsubscribe in one click.
      </span>
      <IdeaNote>
        Today&rsquo;s email lists due cards. The new subject and the &ldquo;yesterday added&rdquo;
        line are the Friday change.
      </IdeaNote>
    </div>
  );
}

type Step = { label: string; item: string };

/** A flow map: each step links to its preview on the canvas. */
export function FlowPreview({
  title,
  steps,
  note,
}: {
  title: string;
  steps: Step[];
  note: string;
}) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <span className="type-heading">{title}</span>
      <ol className="flex flex-col gap-2">
        {steps.map((step, i) => (
          <li key={step.item} className="flex items-baseline gap-3">
            <span className="type-label text-text-3 tabular-nums">{i + 1}</span>
            <a
              href={`#item-${step.item}`}
              className="type-body text-text-1 underline underline-offset-4"
            >
              {step.label}
            </a>
          </li>
        ))}
      </ol>
      <IdeaNote>{note}</IdeaNote>
    </div>
  );
}
