"use client";

// Redesign options for the onboarding routes, /setup and /cli/approve. Each route gets three different layouts that
// teach on the page itself: what a decision card is, why you answer before you see the why, what days 1, 4 and 11
// mean, what explained and owned mean, and what to do next. Synthetic data only; no answer key is ever shown.

import { CheckCircleIcon, CircleIcon, LaptopIcon, LockSimpleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useId } from "react";

import { Container } from "@/components/app/container";
import { EmptyState } from "@/components/app/empty-state";
import { AppPageHeader } from "@/components/app/page-header";
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
import { CodeBlock } from "@/components/ui/code-block";
import { Collapsible, CollapsibleContent, CollapsibleRow } from "@/components/ui/collapsible";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

import { AppFrame } from "../frames";
import { IdeaNote, Terminal } from "../parts";
import { DEVICE_CODE, FIRST_PUSH, NEW_CARDS } from "../prototype-data";

const SETUP_TITLE = "Setup";
const SETUP_DESCRIPTION = "Connect Claude Code, so each session you finish becomes decision cards.";
const APPROVE_PATH = `/cli/approve?code=${DEVICE_CODE}`;
const DEVICE = "sams-mbp (macOS)";
// The hook from lib/setup/ai-prompt.ts: per project, pinned, async, uploads one finished session per start.
const HOOK = `{"hooks":{"SessionStart":[{"matcher":"startup|resume|clear","hooks":[{"type":"command","command":"npx --yes session-coach@0.3.0 sync","async":true}]}]}}`;
// The sample card's face. Only the decision and the question: the why stays hidden, as on the real review page.
const SAMPLE = NEW_CARDS[0];
// The CLI's guided setup (packages/cli/src/cli.ts): sign in, add the hook, push, then what's next. Asks before each.
const INIT = "npx session-coach@latest init";

type StepState = "done" | "now" | "next";

const SETUP_STEPS: { title: string; what: string; command: string }[] = [
  {
    title: "Sign the CLI in",
    what: "Prints a code and opens your browser. You check the code and approve; no token to copy.",
    command: "npx session-coach@latest login",
  },
  {
    title: "Turn on auto-upload",
    what: "A SessionStart hook in this project's .claude/settings.json. Each time a session starts, it uploads one finished session in the background.",
    command: "npx --yes session-coach@0.3.0 sync",
  },
  {
    title: "Push your first session",
    what: "Uploads the last Claude Code session you ran in this folder, so you don't wait for the hook.",
    command: "npx session-coach@latest push --latest",
  },
];

function StepIcon({ state }: { state: StepState }) {
  if (state === "done")
    return <CheckCircleIcon weight="fill" className="text-success-text" aria-hidden />;
  if (state === "now") return <CircleIcon weight="bold" className="text-text-1" aria-hidden />;
  return <CircleIcon className="text-text-3" aria-hidden />;
}

const STATE_BADGE: Record<StepState, React.ReactNode> = {
  done: <Badge variant="success">Done</Badge>,
  now: <Badge>Now</Badge>,
  next: <Badge variant="outline">Next</Badge>,
};

/** A decision card's question face: what the agent decided, the question, an answer box, and the why still locked. */
function SampleCardFace() {
  // Three options render this face in one canvas row, so the field id must be unique per instance.
  const answerId = useId();
  return (
    <div className="frame flex flex-col gap-3 bg-page p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate type-label-sm text-text-3">
          Decision card · {SAMPLE.file}
        </span>
        <Badge variant="outline">Review day 1</Badge>
      </div>
      <p className="type-label text-text-2">{SAMPLE.decision}</p>
      <p className="type-heading-sm text-text-1">{SAMPLE.question}</p>
      <Field>
        <FieldLabel htmlFor={answerId}>Your answer</FieldLabel>
        <Textarea
          id={answerId}
          disabled
          placeholder="In your own words, why did the agent do it this way?"
        />
      </Field>
      <p className="flex items-center gap-2 type-body-sm text-text-2">
        <LockSimpleIcon aria-hidden />
        The why, the quote from your session and the model answer open after you send.
      </p>
    </div>
  );
}

const SCHEDULE = [
  { day: "Day 1", what: "First try, the day after the session." },
  { day: "Day 4", what: "Right on day 1? It comes back 3 days later." },
  { day: "Day 11", what: "Right again? 7 days later. Pass this one and it's owned." },
];

/** Days 1, 4 and 11 as a row of three stops, with the drop rule under it. */
function ScheduleStrip() {
  return (
    <div className="flex flex-col gap-3">
      <ol className="grid grid-cols-3 gap-3">
        {SCHEDULE.map(({ day, what }) => (
          <li key={day} className="flex flex-col gap-1 well p-3">
            <span className="type-label text-text-1">{day}</span>
            <span className="type-body-sm text-text-2">{what}</span>
          </li>
        ))}
      </ol>
      <p className="type-body-sm text-text-2">
        Scored 2 is Explained, 1 Partly, 0 Missed. Below 2 moves the card one step back (never
        before day 1), and it comes back tomorrow. At most 5 cards a day.
      </p>
    </div>
  );
}

/** Explained vs owned, defined next to the empty numbers they will fill. */
function ExplainedOwned() {
  return (
    <DataList variant="framed">
      <DataListItem>
        <DataListLabel>Explained 0</DataListLabel>
        <DataListValue>You answered a card right at least once.</DataListValue>
      </DataListItem>
      <DataListItem>
        <DataListLabel>Owned 0</DataListLabel>
        <DataListValue>You passed its day-11 review. The decision is yours now.</DataListValue>
      </DataListItem>
      <DataListItem>
        <DataListLabel>Defend it</DataListLabel>
        <DataListValue>
          Optional. Once a card is explained, answer a follow-up question on it for harder practice.
        </DataListValue>
      </DataListItem>
    </DataList>
  );
}

/** Setup A, guided checklist: the three steps in order, each with what it does, and the payoff in the rail. */
export function OnboardingSetupOptionA() {
  const states: StepState[] = ["done", "now", "next"];
  return (
    <AppFrame path="/setup" sessions={[]} dueCount={0}>
      <Container>
        <AppPageHeader title={SETUP_TITLE} description={SETUP_DESCRIPTION} />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 flex flex-col gap-6">
            <Field>
              <FieldLabel>Quickest: one command in your project&rsquo;s folder</FieldLabel>
              <CodeBlock variant="command" command={INIT} />
              <FieldDescription>
                It runs the three steps below in your terminal and asks before each one. Prefer to
                see every piece? Do them by hand here.
              </FieldDescription>
            </Field>
            <Progress value={33}>
              <ProgressLabel>1 of 3 steps done</ProgressLabel>
              <ProgressValue />
            </Progress>
            <ol className="flex flex-col gap-4">
              {SETUP_STEPS.map((step, i) => (
                <li key={step.title}>
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        <h2 className="flex items-center gap-2">
                          <StepIcon state={states[i]} />
                          {i + 1}. {step.title}
                        </h2>
                      </CardTitle>
                      <CardDescription>{step.what}</CardDescription>
                      <CardAction>{STATE_BADGE[states[i]]}</CardAction>
                    </CardHeader>
                    {states[i] !== "done" && (
                      <CardContent>
                        {i === 1 ? (
                          <div className="flex flex-col gap-3">
                            <CodeBlock
                              code={HOOK}
                              filename=".claude/settings.json (merge, keep what is there)"
                              lineNumbers={false}
                              defaultWrap
                              copyLabel="Copy the hook"
                            />
                            <p className="type-body-sm text-text-2">
                              It skips sessions changed in the last 5 minutes, so a session you are
                              still in is never uploaded half done.
                            </p>
                          </div>
                        ) : (
                          <CodeBlock variant="command" command={step.command} />
                        )}
                      </CardContent>
                    )}
                    {states[i] === "done" && (
                      <CardContent>
                        <p className="type-body-sm text-text-2">
                          Signed in on {DEVICE}. It shows under Connected devices below.
                        </p>
                      </CardContent>
                    )}
                  </Card>
                </li>
              ))}
            </ol>
          </div>
          <aside className="flex flex-col gap-4" aria-label="What you get">
            <h2 className="type-heading-sm text-text-1">What your first push turns into</h2>
            <p className="type-body-sm text-text-2">
              Each session becomes up to 5 decision cards: one choice your agent made, asked back as
              a question.
            </p>
            <SampleCardFace />
            <h3 className="type-label text-text-1">When it comes back</h3>
            <ScheduleStrip />
            <h3 className="type-label text-text-1">What you are counting</h3>
            <ExplainedOwned />
          </aside>
        </div>
        <IdeaNote>
          A checklist with one open step at a time. The rail answers &ldquo;what is this for?&rdquo;
          before the first card exists, so the empty dashboard is never the first explanation.
        </IdeaNote>
      </Container>
    </AppFrame>
  );
}

/** Setup B, explain-as-you-go: every row pairs what you do (left) with what it means (right). */
export function OnboardingSetupOptionB() {
  const rows: { title: string; doIt: React.ReactNode; means: React.ReactNode }[] = [
    {
      title: "Sign in",
      doIt: <CodeBlock variant="command" command="npx session-coach@latest login" />,
      means: (
        <p className="type-body-sm text-text-2">
          The CLI prints a code like {DEVICE_CODE} and opens this site. You approve once; the code
          works once and expires after 10 minutes. The token lands in ~/.session-coach/config.json,
          never in your terminal or chat.
        </p>
      ),
    },
    {
      title: "Auto-upload",
      doIt: (
        <CodeBlock
          code={HOOK}
          filename=".claude/settings.json"
          lineNumbers={false}
          defaultWrap
          copyLabel="Copy the hook"
        />
      ),
      means: (
        <p className="type-body-sm text-text-2">
          Each time a Claude Code session starts in this project, the hook uploads one finished
          session in the background. Secrets are redacted on your laptop first, then again on the
          server.
        </p>
      ),
    },
    {
      title: "First push",
      doIt: <CodeBlock variant="command" command="npx session-coach@latest push --latest" />,
      means: (
        <div className="flex flex-col gap-3">
          <p className="type-body-sm text-text-2">
            In about a minute the session turns into up to 5 decision cards like this one. You
            answer first: the review tests what you remember, not what you just read.
          </p>
          <SampleCardFace />
        </div>
      ),
    },
    {
      title: "Then, reviews",
      doIt: (
        <EmptyState
          variant="framed"
          title="No reviews yet"
          description="Your first cards are due the day after your first push. Come back to Review then."
        />
      ),
      means: (
        <div className="flex flex-col gap-3">
          <ScheduleStrip />
          <ExplainedOwned />
        </div>
      ),
    },
  ];
  return (
    <AppFrame path="/setup" sessions={[]} dueCount={0}>
      <Container>
        <AppPageHeader title={SETUP_TITLE} description={SETUP_DESCRIPTION} />
        <section className="grid grid-cols-2 gap-6 pb-8" aria-label="All at once">
          <div className="flex flex-col gap-3">
            <h2 className="type-heading-sm text-text-1">All at once</h2>
            <CodeBlock variant="command" command={INIT} />
          </div>
          <p className="border-s border-hair ps-6 type-body-sm text-text-2">
            Runs steps 1 to 3 below in your terminal. It says what each one does and changes nothing
            without a yes. Want to see each piece first? Read across, one row at a time.
          </p>
        </section>
        <div className="grid grid-cols-2 gap-6 rule-row pb-2">
          <h2 className="type-label text-text-3">Or step by step: do this</h2>
          <h2 className="type-label text-text-3">What it means</h2>
        </div>
        <ol className="flex flex-col gap-8">
          {rows.map((row, i) => (
            <li key={row.title} className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-3">
                <h3 className="type-heading-sm text-text-1">
                  {i + 1}. {row.title}
                </h3>
                {row.doIt}
              </div>
              <div className="flex flex-col gap-3 border-s border-hair ps-6">{row.means}</div>
            </li>
          ))}
        </ol>
        <IdeaNote>
          Two columns that read across: each command sits beside the plain-language result, so a
          developer who skims the left still learns the model from the right.
        </IdeaNote>
      </Container>
    </AppFrame>
  );
}

/** Setup C, focused single task: only the current step, its reason one click away, and what is next in one line. */
export function OnboardingSetupOptionC() {
  return (
    <AppFrame path="/setup" sessions={[]} dueCount={0}>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-(--gutter) py-12">
        <div className="flex flex-col gap-2">
          <span className="type-label text-text-3">Step 3 of 3 · Setup</span>
          <h1 className="type-display text-text-1">Push your first session</h1>
          <p className="type-body-lg text-text-2">
            You are signed in on {DEVICE} and auto-upload is on. One push now, and your first
            decision cards arrive in about a minute.
          </p>
        </div>
        <Progress value={66} aria-label="Setup progress">
          <ProgressLabel>2 of 3 done</ProgressLabel>
          <ProgressValue />
        </Progress>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="flex items-center gap-2">
                <Spinner />
                Waiting for a session
              </h2>
            </CardTitle>
            <CardDescription>
              Run this in the folder you used Claude Code in, or say yes at step 3 of {INIT}. This
              page updates when it lands.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel>In your terminal</FieldLabel>
              <CodeBlock variant="command" command="npx session-coach@latest push --latest" />
              <FieldDescription>
                Uploads the last session in this folder, like &ldquo;{FIRST_PUSH.title}&rdquo;.
              </FieldDescription>
            </Field>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-1">
          <Collapsible defaultOpen>
            <CollapsibleRow summary="A choice your agent made, asked back">
              What is a decision card?
            </CollapsibleRow>
            <CollapsibleContent>
              <div className="flex flex-col gap-3 py-3">
                <p className="type-body-sm text-text-2">
                  One choice your agent made in the session, with the file and a quote as proof. You
                  get the question first and write the why yourself; the answer opens after.
                </p>
                <SampleCardFace />
              </div>
            </CollapsibleContent>
          </Collapsible>
          <Collapsible>
            <CollapsibleRow summary="Day 1, 4, 11">When do cards come back?</CollapsibleRow>
            <CollapsibleContent>
              <div className="py-3">
                <ScheduleStrip />
              </div>
            </CollapsibleContent>
          </Collapsible>
          <Collapsible>
            <CollapsibleRow summary="Right once, or passed day 11">
              Explained or owned?
            </CollapsibleRow>
            <CollapsibleContent>
              <div className="py-3">
                <ExplainedOwned />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
        <p className="type-body-sm text-text-3">
          Next: answer your first cards tomorrow, on Review.
        </p>
        <IdeaNote>
          One task fills the page. Steps already done shrink to a sentence; the concepts wait in
          rows that open on demand, with the card one open by default.
        </IdeaNote>
      </div>
    </AppFrame>
  );
}

function ApproveShell({ children }: { children: React.ReactNode }) {
  return (
    <AppFrame path={APPROVE_PATH} crumb="Connect the CLI" sessions={[]} dueCount={0}>
      <Container>
        <AppPageHeader
          title="Connect the CLI"
          description="Check the code matches the one in your terminal, then approve."
        />
        {children}
      </Container>
    </AppFrame>
  );
}

const TERMINAL_LINES = [
  "$ npx session-coach@latest login",
  "",
  `Your code: ${DEVICE_CODE}`,
  `Opening https://coach.ziaa.me${APPROVE_PATH}`,
  "",
  "Waiting for you to approve in the browser...",
];

/** Approve A, match side by side: the terminal and this page next to each other, and three checks before the button. */
export function OnboardingCliApproveOptionA() {
  const checks = [
    "The code on the left is the code in your terminal.",
    `You just ran session-coach login yourself, on ${DEVICE}.`,
    "Approving lets that computer upload sessions to your account.",
  ];
  return (
    <ApproveShell>
      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          <h2 className="type-label text-text-3">Your terminal should show</h2>
          <Terminal lines={TERMINAL_LINES} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>This page shows</h2>
            </CardTitle>
            <CardDescription>
              Same code? Then it is your login, not someone else&rsquo;s link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <span className="type-stat-lg text-text-1 tabular-nums">{DEVICE_CODE}</span>
              <p className="type-body-sm text-text-2">
                After you approve, go back to your terminal. It signs in by itself.
              </p>
              <ul className="flex flex-col gap-2">
                {checks.map((check) => (
                  <li key={check} className="flex items-start gap-2 type-body-sm text-text-2">
                    <CheckCircleIcon className="text-text-3" aria-hidden />
                    {check}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button>Approve</Button>
            <Button variant="secondary">Deny</Button>
          </CardFooter>
        </Card>
      </div>
      <IdeaNote>
        The check is the lesson: put the two codes in one glance and spell out what approving
        grants, so a phished link reads as wrong without a warning banner.
      </IdeaNote>
    </ApproveShell>
  );
}

/** Approve B, approve with the road ahead: the request on the left, what happens after you click on the right. */
export function OnboardingCliApproveOptionB() {
  const after = [
    {
      title: "Your terminal signs in",
      what: "Within a few seconds. The token is saved to ~/.session-coach/config.json.",
    },
    {
      title: `${DEVICE} joins Connected devices`,
      what: "On Setup. Revoke it there to sign that computer out.",
    },
    {
      title: "You push a session",
      what: "By hand with push --latest, or the SessionStart hook does it.",
    },
    {
      title: "Up to 5 decision cards arrive",
      what: "Each asks why your agent made one choice. You answer before you see the why.",
    },
    { title: "Reviews on day 1, 4 and 11", what: "Right on day 11 and the decision is owned." },
  ];
  return (
    <ApproveShell>
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Approve this CLI login?</h2>
              </CardTitle>
              <CardDescription>
                Only if you just ran session-coach login and the code matches your terminal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataList variant="framed">
                <DataListItem>
                  <DataListLabel>Code</DataListLabel>
                  <DataListValue>{DEVICE_CODE}</DataListValue>
                </DataListItem>
                <DataListItem>
                  <DataListLabel>Device</DataListLabel>
                  <DataListValue>{DEVICE}</DataListValue>
                </DataListItem>
                <DataListItem>
                  <DataListLabel>Requested</DataListLabel>
                  <DataListValue>1 minute ago</DataListValue>
                </DataListItem>
                <DataListItem>
                  <DataListLabel>Expires in</DataListLabel>
                  <DataListValue>
                    <span className="tabular-nums">8:42</span>
                  </DataListValue>
                </DataListItem>
              </DataList>
            </CardContent>
            <CardFooter>
              <Button>Approve</Button>
              <Button variant="secondary">Deny</Button>
            </CardFooter>
          </Card>
        </div>
        <section className="col-span-3 flex flex-col gap-4" aria-label="After you approve">
          <h2 className="type-heading-sm text-text-1">After you approve</h2>
          <ol className="flex flex-col gap-3">
            {after.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="type-label text-text-3 tabular-nums">{i + 1}</span>
                <div className="flex flex-col gap-1">
                  <span className="type-label text-text-1">{step.title}</span>
                  <span className="type-body-sm text-text-2">{step.what}</span>
                </div>
              </li>
            ))}
          </ol>
          <Link href="/setup" className={buttonVariants({ variant: "link" })}>
            Back to Setup when you are done
          </Link>
        </section>
      </div>
      <IdeaNote>
        The approve card stays small; the wider column is the map from this click to the first owned
        decision, so the login reads as step one of something.
      </IdeaNote>
    </ApproveShell>
  );
}

/** Approve C, one question: the code huge, two answers, and every explanation folded below. */
export function OnboardingCliApproveOptionC() {
  return (
    <AppFrame path={APPROVE_PATH} crumb="Connect the CLI" sessions={[]} dueCount={0}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-(--gutter) py-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <LaptopIcon weight="duotone" className="size-8 text-text-2" aria-hidden />
          <h1 className="type-heading-lg text-text-1">Is this the code in your terminal?</h1>
          <span className="type-stat-xl text-text-1 tabular-nums">{DEVICE_CODE}</span>
          <p className="type-body-sm text-text-2">
            {DEVICE} · requested 1 minute ago · expires in 8:42
          </p>
          <div className="flex gap-3">
            <Button size="lg">Yes, approve</Button>
            <Button size="lg" variant="secondary">
              No, deny
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Collapsible defaultOpen>
            <CollapsibleRow>What does approving do?</CollapsibleRow>
            <CollapsibleContent>
              <p className="py-2 ps-7 type-body-sm text-text-2">
                It gives that computer a token of its own, so it can upload your Claude Code
                sessions. Each session becomes up to 5 decision cards to explain back. Then go back
                to your terminal: it signs in by itself.
              </p>
            </CollapsibleContent>
          </Collapsible>
          <Collapsible>
            <CollapsibleRow>Why a code and not a token?</CollapsibleRow>
            <CollapsibleContent>
              <p className="py-2 ps-7 type-body-sm text-text-2">
                A pasted token ends up in shell history and chat logs. This code works once and
                expires after 10 minutes.
              </p>
            </CollapsibleContent>
          </Collapsible>
          <Collapsible>
            <CollapsibleRow>Didn&rsquo;t run session-coach login?</CollapsibleRow>
            <CollapsibleContent>
              <p className="py-2 ps-7 type-body-sm text-text-2">
                Deny it. Nothing is signed in, and nothing else is needed.
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
        <IdeaNote>
          The page asks one yes-or-no question. Answers to &ldquo;what is this?&rdquo; sit folded
          under it, with the first one open for a newcomer.
        </IdeaNote>
      </div>
    </AppFrame>
  );
}
