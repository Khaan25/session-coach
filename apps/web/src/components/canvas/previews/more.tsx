"use client";

// Progress, settings, the daily email, and the flow maps that link the screens together.
// ProfileForm saves through a Server Action and DeleteAccountDialog calls the account route, so both looks are rebuilt
// here; SettingsCard, AnswersChart and the state presets are the real components.

import Link from "next/link";

import { Container } from "@/components/app/container";
import { NoReviewsEmpty } from "@/components/app/empty-state";
import { SessionListLoading } from "@/components/app/loading-state";
import { AppPageHeader } from "@/components/app/page-header";
import { ScoreBadge, type Score } from "@/components/app/score-badge";
import { AnswersChart } from "@/components/progress/answers-chart";
import { SettingsCard } from "@/components/settings/settings-card";
import { AlertDialogFooter, AlertDialogHeader } from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { PageHeaderStat, PageHeaderStats } from "@/components/ui/page-header";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat, StatGroup, StatLabel, StatValue } from "@/components/ui/stat";
import { Switch } from "@/components/ui/switch";

import { AppFrame } from "./frames";
import { IdeaNote } from "./parts";

const STEPS = [
  { label: "New", count: 6 },
  { label: "Day 1", count: 5 },
  { label: "Day 3", count: 7 },
  { label: "Day 7", count: 4 },
  { label: "Owned", count: 17 },
];

const PROGRESS_DESCRIPTION = "Owned cards, plus cards you explained in full in the last 7 days.";

const ANSWERS = Array.from({ length: 30 }, (_, i) => ({
  day: `Oct ${i + 4}`,
  answers: [3, 0, 2, 4, 1, 5, 2][i % 7],
}));
const SCORE_MIX: Record<Score, number> = { 2: 41, 1: 17, 0: 6 };
const SCORES: Score[] = [2, 1, 0];
const BY_SESSION = [
  { id: "7f3a2c91", title: "Add rate limiting to the upload route", owned: 3, total: 4 },
  { id: "b81d0e44", title: "Write transcriptParser.ts", owned: 2, total: 5 },
  { id: "0d4f6b38", title: "Stream the CLI upload", owned: 1, total: 3 },
];

export function ProgressPreview({ state }: { state: "full" | "empty" | "loading" }) {
  const answered = SCORES.reduce<number>((sum, score) => sum + SCORE_MIX[score], 0);
  return (
    <AppFrame path="/progress" dueCount={state === "full" ? 3 : 0}>
      <Container>
        <AppPageHeader title="Progress" description={PROGRESS_DESCRIPTION}>
          {state === "full" && (
            <PageHeaderStats>
              <PageHeaderStat
                label="Decisions you can still explain"
                value={22}
                detail="of 39 cards"
              />
              <PageHeaderStat label="Owned" value={17} />
            </PageHeaderStats>
          )}
        </AppPageHeader>
        {state === "empty" && <NoReviewsEmpty />}
        {state === "loading" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>Cards by step</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>
                    <h2>Answers per day</h2>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-56 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>
                    <h2>Score mix</h2>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-56 w-full" />
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>By session</h2>
                </CardTitle>
              </CardHeader>
              <SessionListLoading rows={3} />
            </Card>
          </>
        )}
        {state === "full" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>Cards by step</h2>
                </CardTitle>
                <CardDescription>
                  A miss sends a card back. Owned cards stay owned unless a defence fails.
                </CardDescription>
              </CardHeader>
              <StatGroup variant="plain">
                {STEPS.map(({ label, count }) => (
                  <Stat key={label}>
                    <StatLabel>{label}</StatLabel>
                    <StatValue>{count}</StatValue>
                  </Stat>
                ))}
              </StatGroup>
            </Card>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>
                    <h2>Answers per day</h2>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AnswersChart data={ANSWERS} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>
                    <h2>Score mix</h2>
                  </CardTitle>
                  <CardDescription>
                    {answered} answers in the last {ANSWERS.length} days.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {SCORES.map((score) => (
                    <Progress key={score} value={Math.round((SCORE_MIX[score] / answered) * 100)}>
                      <ProgressLabel>
                        <ScoreBadge score={score} /> {SCORE_MIX[score]} answers
                      </ProgressLabel>
                      <ProgressValue />
                    </Progress>
                  ))}
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>By session</h2>
                </CardTitle>
              </CardHeader>
              <ItemGroup>
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
            </Card>
          </>
        )}
      </Container>
    </AppFrame>
  );
}

const TIMEZONES = ["Asia/Karachi", "Europe/London", "America/New_York", "UTC"];

/** The open delete confirmation, drawn in place: the real AlertDialog is modal and would trap the whole canvas. */
function DeleteAccountOpen() {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-overlay p-4">
      <section
        aria-labelledby="canvas-delete-title"
        className="flex w-full max-w-overlay-sm flex-col rounded-frame bg-(--surface-frame) text-text-1 shadow-overlay"
      >
        <AlertDialogHeader>
          <h2 id="canvas-delete-title" className="type-heading-xs break-words text-text-1">
            Delete your account?
          </h2>
          <p className="type-body break-words text-text-2">
            This deletes your sessions, cards, answers and tokens for good. It can&apos;t be undone.
          </p>
          <Field className="mt-3">
            <FieldLabel htmlFor="canvas-delete-email">Type sam@example.com to confirm</FieldLabel>
            <Input id="canvas-delete-email" type="email" autoComplete="off" defaultValue="sam@" />
          </Field>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="secondary">Keep account</Button>
          <Button variant="destructive" disabled>
            Delete account
          </Button>
        </AlertDialogFooter>
      </section>
    </div>
  );
}

export function SettingsPreview({ deleteOpen }: { deleteOpen?: boolean }) {
  const id = deleteOpen ? "canvas-settings-open" : "canvas-settings";
  return (
    <AppFrame path="/settings" overlay={deleteOpen && <DeleteAccountOpen />}>
      <Container>
        <AppPageHeader title="Settings" description="Your profile, reminders and account." />
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Profile</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={`${id}-name`}>Display name</FieldLabel>
                  <Input id={`${id}-name`} defaultValue="Sam Rivera" />
                  <FieldDescription>The CLI and the report greet you with this.</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${id}-email`}>Email</FieldLabel>
                  <Input id={`${id}-email`} type="email" value="sam@example.com" readOnly />
                  <FieldDescription>Comes from how you sign in.</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${id}-timezone`}>Time zone</FieldLabel>
                  <Combobox items={TIMEZONES} defaultValue="Asia/Karachi">
                    <ComboboxInput id={`${id}-timezone`} placeholder="Find a time zone" />
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
                  <FieldDescription>Sets when a card is due today.</FieldDescription>
                </Field>
                <FieldSeparator />
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor={`${id}-notify`}>Email reminders</FieldLabel>
                    <FieldDescription>
                      One email at 6 pm: what yesterday added, and what is due.
                    </FieldDescription>
                  </FieldContent>
                  <Switch id={`${id}-notify`} defaultChecked />
                </Field>
              </FieldGroup>
            </CardContent>
            <CardFooter>
              <Button>Save profile</Button>
            </CardFooter>
          </Card>
          <SettingsCard
            title="Sign out everywhere"
            description="Signs you out on every browser and device, including this one."
          >
            <Button variant="secondary" size="sm">
              Sign out everywhere
            </Button>
          </SettingsCard>
          <SettingsCard
            title="Connected devices"
            description="See and disconnect the computers the CLI is signed in on."
          >
            <Link href="/setup" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Manage devices
            </Link>
          </SettingsCard>
          <SettingsCard
            title="Delete account"
            description="Deletes your sessions, cards, answers and tokens. It can't be undone."
          >
            <Button variant="destructive">Delete account</Button>
          </SettingsCard>
        </div>
      </Container>
    </AppFrame>
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
