"use client";

// Redesign options for the auth routes: three layouts per route, each teaching what Session Coach is while the
// learner signs in, signs up or recovers. A: the real auth layout with a guided checklist in the form column.
// B: the form on the left and an explain-as-you-go panel in place of the art. C: one focused task, with the
// explanation behind progressive disclosure. Synthetic data only; no answer key is ever shown.

import {
  ArrowRightIcon,
  CheckCircleIcon,
  CircleDashedIcon,
  CircleIcon,
  EnvelopeSimpleIcon,
  LinkBreakIcon,
  LockKeyIcon,
  SealCheckIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

import { AuthNotice } from "@/components/auth/auth-notice";
import { AuthCard, AuthHeading, AuthSwitch, BrandLink } from "@/components/auth/auth-parts";
import { GoogleIcon } from "@/components/auth/google-icon";
import { MIN_PASSWORD } from "@/lib/auth/validate";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleRow } from "@/components/ui/collapsible";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { AuthFrame } from "../frames";

// ---------------------------------------------------------------------------------------------------------------
// Shells. AuthFrame is the real layout (option A). B and C replace the art, so they rebuild the browser bar here.

const FOOTER = ["Privacy", "Terms", "Support"];

function Window({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-page">
      <div className="flex shrink-0 items-center gap-3 border-b border-hair bg-well px-4 py-2">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-cell-quiet" />
          <span className="size-2.5 rounded-full bg-cell-quiet" />
          <span className="size-2.5 rounded-full bg-cell-quiet" />
        </span>
        <span className="mx-auto w-full max-w-xl truncate rounded-soft bg-page px-3 py-1 text-center type-code-sm text-text-2">
          coach.ziaa.me{path}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="px-(--gutter) py-8">
      <ul className="flex justify-center gap-6">
        {FOOTER.map((label) => (
          <li key={label}>
            <Link
              href={`/${label.toLowerCase()}`}
              className="type-body-sm text-text-2 transition-colors duration-(--dur-fast) hover:text-text-1"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </footer>
  );
}

/** Option B: the form column on the left, a panel that explains the product on the right, in place of the art. */
function SplitShell({
  path,
  aside,
  children,
}: {
  path: string;
  aside: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Window path={path}>
      <div className="grid min-h-full flex-1 grid-cols-2 bg-page">
        <div className="flex flex-col">
          <header className="flex h-20 items-center px-(--gutter)">
            <BrandLink />
          </header>
          <main className="flex flex-1 flex-col justify-center">
            <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-(--gutter) py-16">
              {children}
            </div>
          </main>
          <Footer />
        </div>
        <aside className="flex flex-col justify-center gap-6 border-s border-hair bg-surface px-16 py-16">
          {aside}
        </aside>
      </div>
    </Window>
  );
}

/** Option C: no art, no second column. One centred task, with anything else folded away. */
function FocusShell({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <Window path={path}>
      <div className="flex min-h-full flex-1 flex-col bg-page">
        <header className="flex h-20 items-center justify-center px-(--gutter)">
          <BrandLink />
        </header>
        <main className="flex flex-1 flex-col justify-center">
          <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-(--gutter) py-8">
            {children}
          </div>
        </main>
        <Footer />
      </div>
    </Window>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Teaching pieces. Facts from README.md and docs/CODEBASE.md: up to 5 cards a session, 5 answers a day, reviews on
// day 1, 4 and 11, a 2 moves a card on, below 2 moves it one step back and it returns tomorrow, explained = scored 2
// at least once, owned = mastered.

const SAMPLE = {
  session: "Add rate limiting to the upload route",
  decision: "Rate limit uploads per CLI token, not per IP",
  question: "Why key the upload limit on the token? What breaks if you key it on the IP instead?",
};

/** A decision card before it is answered: the question and the answer box. The why stays locked. */
function SampleCard({
  id,
  caption,
  compact,
}: {
  id: string;
  caption?: React.ReactNode;
  /** The question as the description, no answer box: for a column that also holds a form. */
  compact?: boolean;
}) {
  if (compact)
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Decision card</Badge>
            <Badge variant="outline">Day 1</Badge>
          </div>
          <CardTitle>{SAMPLE.question}</CardTitle>
          <CardDescription>
            You answer in your own words first. The why opens after.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Decision card</Badge>
          <Badge variant="outline">Day 1</Badge>
        </div>
        <CardTitle>{SAMPLE.decision}</CardTitle>
        <CardDescription>From the session &ldquo;{SAMPLE.session}&rdquo;</CardDescription>
      </CardHeader>
      <CardContent>
        <Field>
          <FieldLabel htmlFor={id}>{SAMPLE.question}</FieldLabel>
          <Textarea id={id} disabled placeholder="Explain it in your own words" />
          <FieldDescription>
            The why opens after you answer. Recalling it first is what makes it stick.
          </FieldDescription>
        </Field>
      </CardContent>
      {caption && (
        <CardFooter>
          <p className="type-body-sm text-text-2">{caption}</p>
        </CardFooter>
      )}
    </Card>
  );
}

const DAYS = ["Day 1", "Day 4", "Day 11"] as const;

/** The review schedule as a strip, with the rule that moves a card under it. */
function ScheduleStrip() {
  return (
    <div className="flex flex-col gap-3">
      <ol aria-label="Review schedule" className="flex items-center gap-2">
        {DAYS.map((day) => (
          <li key={day} className="flex flex-1 items-center gap-2">
            <Badge variant="outline">{day}</Badge>
            <span aria-hidden className="h-px min-w-3 flex-1 bg-line-row" />
          </li>
        ))}
        <li>
          <Badge variant="success">
            <SealCheckIcon weight="fill" data-icon="inline-start" aria-hidden />
            Mastered
          </Badge>
        </li>
      </ol>
      <p className="type-body-sm text-text-2">
        Explained (2) moves the card on. Partly (1) or missed (0) moves it back a step, and it comes
        back tomorrow. Never more than 5 answers a day.
      </p>
    </div>
  );
}

/** The three words the app uses everywhere, defined once. */
function Glossary() {
  return (
    <DataList orientation="vertical">
      <DataListItem>
        <DataListLabel>Decision card</DataListLabel>
        <DataListValue>
          One choice your agent made in a session, turned into a question you explain back. Up to 5
          per session.
        </DataListValue>
      </DataListItem>
      <DataListItem>
        <DataListLabel>Explained</DataListLabel>
        <DataListValue>You scored 2 on the card at least once.</DataListValue>
      </DataListItem>
      <DataListItem>
        <DataListLabel>Owned</DataListLabel>
        <DataListValue>You passed its day 11 review. The card is mastered.</DataListValue>
      </DataListItem>
    </DataList>
  );
}

type StepState = "done" | "current" | "next";

const FIRST_RUN = [
  { title: "Create your account", body: "Email or Google." },
  { title: "Confirm your email", body: "The link works once, on this device." },
  {
    title: "Connect the CLI",
    body: "Setup gives your agent one prompt. You approve in one click.",
  },
  { title: "Push a session", body: "It becomes up to 5 decision cards." },
  { title: "Answer your first card", body: "Explain it before you see the why." },
] as const;

function StepIcon({ state }: { state: StepState }) {
  if (state === "done") return <CheckCircleIcon weight="fill" aria-hidden />;
  if (state === "current") return <CircleDashedIcon weight="bold" aria-hidden />;
  return <CircleIcon aria-hidden />;
}

/** A checklist of steps, with where the learner is now marked. */
function Checklist({
  steps,
  current,
  label,
}: {
  steps: readonly { title: string; body?: string }[];
  current: number;
  label: string;
}) {
  return (
    <ItemGroup aria-label={label}>
      {steps.map((step, i) => {
        const state: StepState = i < current ? "done" : i === current ? "current" : "next";
        return (
          <Item key={step.title} size="sm" aria-current={state === "current" ? "step" : undefined}>
            <ItemMedia variant="icon">
              <StepIcon state={state} />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>
                {step.title}
                {state === "current" && <Badge variant="outline">You are here</Badge>}
              </ItemTitle>
              {step.body && <ItemDescription>{step.body}</ItemDescription>}
            </ItemContent>
          </Item>
        );
      })}
    </ItemGroup>
  );
}

/** The same steps as one compact row of tags, for a column the form already fills. */
function StepStrip({
  steps,
  current,
  label,
}: {
  steps: readonly { title: string }[];
  current: number;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="type-label-sm text-text-2">
        Step {current + 1} of {steps.length}: {steps[current]?.title}
      </p>
      <ol aria-label={label} className="flex flex-wrap gap-1.5">
        {steps.map((step, i) => (
          <li key={step.title} aria-current={i === current ? "step" : undefined}>
            <Badge variant={i === current ? "default" : "outline"}>
              {i + 1}. {step.title}
            </Badge>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A labelled fold: the explanation is one click away, not in the way. */
function Fold({
  title,
  summary,
  defaultOpen,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleRow summary={summary}>{title}</CollapsibleRow>
      <CollapsibleContent>
        <div className="flex flex-col gap-4 ps-7 pt-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function PanelHeading({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="type-label-sm text-text-2">{eyebrow}</p>
      <h2 className="font-display text-4xl leading-none tracking-tight text-text-1">{children}</h2>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Form pieces. Ids take a prefix, because many options render on the canvas at once.

function GoogleButton() {
  return (
    <Button variant="secondary" size="lg">
      <GoogleIcon />
      Continue with Google
    </Button>
  );
}

function EmailField({ id, hint }: { id: string; hint?: string }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>Email</FieldLabel>
      <Input id={id} type="email" placeholder="sam@example.com" />
      {hint && <FieldDescription>{hint}</FieldDescription>}
    </Field>
  );
}

function PasswordField({
  id,
  label = "Password",
  hint,
  forgot,
}: {
  id: string;
  label?: string;
  hint?: string;
  forgot?: boolean;
}) {
  return (
    <Field>
      <div className="flex items-baseline justify-between gap-3">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {forgot && (
          <Link href="/forgot-password" className={buttonVariants({ variant: "link" })}>
            Forgot password?
          </Link>
        )}
      </div>
      <Input id={id} type="password" />
      {hint && <FieldDescription>{hint}</FieldDescription>}
    </Field>
  );
}

function LoginForm({ id }: { id: string }) {
  return (
    <AuthCard>
      <FieldGroup>
        <GoogleButton />
        <FieldSeparator>or</FieldSeparator>
        <FieldGroup>
          <EmailField id={`${id}-email`} />
          <PasswordField id={`${id}-password`} forgot />
          <Button size="lg">Sign in</Button>
        </FieldGroup>
      </FieldGroup>
    </AuthCard>
  );
}

function SignUpForm({ id }: { id: string }) {
  return (
    <AuthCard>
      <FieldGroup>
        <GoogleButton />
        <FieldSeparator>or</FieldSeparator>
        <FieldGroup>
          <EmailField id={`${id}-email`} hint="We send one link to confirm it." />
          <PasswordField id={`${id}-password`} hint={`At least ${MIN_PASSWORD} characters.`} />
          <Button size="lg">Create account</Button>
        </FieldGroup>
      </FieldGroup>
    </AuthCard>
  );
}

function ResetForm({ id }: { id: string }) {
  return (
    <AuthCard>
      <FieldGroup>
        <EmailField id={`${id}-email`} hint="The address you sign in with." />
        <Button size="lg">Send reset link</Button>
      </FieldGroup>
    </AuthCard>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// /login

/** A: the real layout. Under the form, what happens after sign-in, as three one-line steps. */
export function AuthLoginOptionA() {
  return (
    <AuthFrame path="/login" scene="sign-in">
      <AuthHeading
        title={
          <>
            Sign <span className="italic">in</span>
          </>
        }
      >
        Pick up your decision cards where you left them.
      </AuthHeading>
      <div className="flex flex-col gap-4">
        <LoginForm id="opt-login-a" />
        <AuthSwitch prompt="New to Session Coach?" href="/sign-up">
          Create an account
        </AuthSwitch>
      </div>
      <Checklist
        label="After you sign in"
        current={0}
        steps={[
          { title: "Sign in" },
          { title: "Answer today's due cards, never more than 5" },
          { title: "Read the why, then the card waits for its next day" },
        ]}
      />
    </AuthFrame>
  );
}

/** B: the form, and beside it the anatomy of the card the learner is signing in to answer. */
export function AuthLoginOptionB() {
  return (
    <SplitShell
      path="/login"
      aside={
        <>
          <PanelHeading eyebrow="What's waiting">A decision card</PanelHeading>
          <SampleCard
            id="opt-login-b-card"
            caption="Each card is one choice your agent made. You answer it from memory, then see the why."
          />
          <ScheduleStrip />
        </>
      }
    >
      <AuthHeading
        title={
          <>
            Sign <span className="italic">in</span>
          </>
        }
      >
        Your due cards are where you left them.
      </AuthHeading>
      <div className="flex flex-col gap-4">
        <LoginForm id="opt-login-b" />
        <AuthSwitch prompt="New to Session Coach?" href="/sign-up">
          Create an account
        </AuthSwitch>
      </div>
    </SplitShell>
  );
}

/** C: only the form. A newcomer who landed here by mistake opens one fold to learn what this is. */
export function AuthLoginOptionC() {
  return (
    <FocusShell path="/login">
      <AuthHeading
        title={
          <>
            Sign <span className="italic">in</span>
          </>
        }
      />
      <LoginForm id="opt-login-c" />
      <div className="flex flex-col gap-2">
        <AuthSwitch prompt="New to Session Coach?" href="/sign-up">
          Create an account
        </AuthSwitch>
        <Fold title="What is Session Coach?" summary="30 seconds">
          <p className="type-body-sm text-text-2">
            After a Claude Code session, it turns the decisions your agent made into up to 5 cards.
            You explain each one back before you see the why, on day 1, 4 and 11.
          </p>
          <Glossary />
        </Fold>
      </div>
    </FocusShell>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// /sign-up

/** A: the real layout. The whole first run as a row of steps above the form, with this one marked. */
export function AuthSignUpOptionA() {
  return (
    <AuthFrame path="/sign-up" scene="sign-up">
      <AuthHeading
        title={
          <>
            Create an <span className="italic">account</span>
          </>
        }
      >
        Five steps to your first decision card. This is the first.
      </AuthHeading>
      <StepStrip label="Your first run" steps={FIRST_RUN} current={0} />
      <div className="flex flex-col gap-4">
        <SignUpForm id="opt-signup-a" />
        <AuthSwitch prompt="Already have an account?" href="/login">
          Sign in
        </AuthSwitch>
      </div>
    </AuthFrame>
  );
}

/** B: the form, and beside it the loop explained in the order the learner meets it. */
export function AuthSignUpOptionB() {
  return (
    <SplitShell
      path="/sign-up"
      aside={
        <>
          <PanelHeading eyebrow="How it works">Own the code your agent wrote</PanelHeading>
          <Card>
            <CardHeader>
              <CardTitle>1. A session becomes cards</CardTitle>
              <CardDescription>
                The CLI uploads a Claude Code session. Up to 5 of its decisions become cards.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>2. You answer first</CardTitle>
              <CardDescription>
                Explain the decision in your own words. The why stays hidden until you do, so you
                learn what you could recall, not what you just read.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>3. Cards come back</CardTitle>
            </CardHeader>
            <CardContent>
              <ScheduleStrip />
            </CardContent>
          </Card>
          <Glossary />
        </>
      }
    >
      <AuthHeading
        title={
          <>
            Create an <span className="italic">account</span>
          </>
        }
      >
        Explain back the decisions your coding agent made, and keep what you learn.
      </AuthHeading>
      <div className="flex flex-col gap-4">
        <SignUpForm id="opt-signup-b" />
        <AuthSwitch prompt="Already have an account?" href="/login">
          Sign in
        </AuthSwitch>
      </div>
    </SplitShell>
  );
}

/** C: one task. The sample card is the pitch, and it shows the one rule: answer before the why. */
export function AuthSignUpOptionC() {
  return (
    <FocusShell path="/sign-up">
      <AuthHeading
        title={
          <>
            Create an <span className="italic">account</span>
          </>
        }
      >
        Then every session you push turns into cards like this one.
      </AuthHeading>
      <SampleCard id="opt-signup-c-card" compact />
      <SignUpForm id="opt-signup-c" />
      <div className="flex flex-col gap-2">
        <AuthSwitch prompt="Already have an account?" href="/login">
          Sign in
        </AuthSwitch>
        <Fold title="When do cards come back?" summary="Day 1, 4, 11">
          <ScheduleStrip />
        </Fold>
      </div>
    </FocusShell>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// /sign-up/check-email

function ResendButton() {
  return (
    <Button variant="secondary" disabled>
      Resend in 42 s
    </Button>
  );
}

const CHECK_EMAIL_LEAD =
  "If that address can sign up, we sent it a link to confirm the account. Open the link on this device to finish.";

/** A: the real layout, with the first-run checklist moved on by one. */
export function AuthCheckEmailOptionA() {
  return (
    <AuthFrame path="/sign-up/check-email" scene="email">
      <AuthHeading
        title={
          <>
            Check your <span className="italic">email</span>
          </>
        }
      >
        {CHECK_EMAIL_LEAD}
      </AuthHeading>
      <Checklist label="Your first run" steps={FIRST_RUN} current={1} />
      <div className="flex flex-wrap items-center gap-4">
        <ResendButton />
        <AuthSwitch prompt="Already confirmed?" href="/login">
          Sign in
        </AuthSwitch>
      </div>
    </AuthFrame>
  );
}

/** B: the wait, and beside it the one thing worth knowing before the first card arrives. */
export function AuthCheckEmailOptionB() {
  return (
    <SplitShell
      path="/sign-up/check-email"
      aside={
        <>
          <PanelHeading eyebrow="While you wait">Your first card will look like this</PanelHeading>
          <SampleCard
            id="opt-check-email-b-card"
            caption="You can't see the why yet, and that's the point: you answer first."
          />
          <Glossary />
        </>
      }
    >
      <AuthHeading
        title={
          <>
            Check your <span className="italic">email</span>
          </>
        }
      >
        {CHECK_EMAIL_LEAD}
      </AuthHeading>
      <div className="flex flex-col items-start gap-4">
        <ResendButton />
        <AuthSwitch prompt="Already confirmed?" href="/login">
          Sign in
        </AuthSwitch>
      </div>
    </SplitShell>
  );
}

/** C: one instruction, and the troubleshooting folded under it for whoever needs it. */
export function AuthCheckEmailOptionC() {
  return (
    <FocusShell path="/sign-up/check-email">
      <AuthNotice title="Open the link we emailed you">{CHECK_EMAIL_LEAD}</AuthNotice>
      <div className="flex flex-col gap-2">
        <Fold title="Didn't get it?" summary="3 things to check">
          <ItemGroup>
            {[
              { title: "Look in spam", body: "Links can land there." },
              { title: "Open it on this device", body: "The link works once, here." },
              { title: "Ask for another", body: "Resend unlocks after a short wait." },
            ].map((row) => (
              <Item key={row.title} size="sm">
                <ItemMedia variant="icon">
                  <EnvelopeSimpleIcon aria-hidden />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{row.title}</ItemTitle>
                  <ItemDescription>{row.body}</ItemDescription>
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
        </Fold>
        <Fold title="What happens after?" summary="Setup, then your first cards">
          <Checklist label="Your first run" steps={FIRST_RUN.slice(2)} current={0} />
        </Fold>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <ResendButton />
        <AuthSwitch prompt="Already confirmed?" href="/login">
          Sign in
        </AuthSwitch>
      </div>
    </FocusShell>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// /forgot-password

const RESET_STEPS = [
  { title: "Enter your email", body: "The one you sign in with." },
  { title: "Open the link in this browser", body: "Reset links work once, where you asked." },
  { title: "Set a new password", body: "Then you're back on your dashboard." },
] as const;

/** A: the real layout, with the three-step reset as a checklist so the email isn't a surprise. */
export function AuthForgotPasswordOptionA() {
  return (
    <AuthFrame path="/forgot-password" scene="password">
      <AuthHeading
        title={
          <>
            Reset your <span className="italic">password</span>
          </>
        }
      />
      <Checklist label="Resetting your password" steps={RESET_STEPS} current={0} />
      <div className="flex flex-col gap-4">
        <ResetForm id="opt-forgot-a" />
        <AuthSwitch prompt="Remembered it?" href="/login">
          Sign in
        </AuthSwitch>
      </div>
    </AuthFrame>
  );
}

/** B: the form, and beside it the reassurance a worried learner needs: a reset touches nothing they learned. */
export function AuthForgotPasswordOptionB() {
  return (
    <SplitShell
      path="/forgot-password"
      aside={
        <>
          <PanelHeading eyebrow="Nothing is lost">A reset changes the password only</PanelHeading>
          <ItemGroup>
            {[
              { title: "Your decision cards", body: "Every card from every session stays." },
              {
                title: "Where each card is in its schedule",
                body: "A card on day 4 is still on day 4.",
              },
              {
                title: "What you've explained and owned",
                body: "Explained is a 2 at least once. Owned is a passed day 11 review.",
              },
            ].map((row) => (
              <Item key={row.title} variant="outline">
                <ItemMedia variant="icon">
                  <CheckCircleIcon weight="duotone" aria-hidden />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{row.title}</ItemTitle>
                  <ItemDescription>{row.body}</ItemDescription>
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
          <ScheduleStrip />
        </>
      }
    >
      <AuthHeading
        title={
          <>
            Reset your <span className="italic">password</span>
          </>
        }
      >
        Enter the address you sign in with and we&apos;ll email you a link to set a new password.
      </AuthHeading>
      <div className="flex flex-col gap-4">
        <ResetForm id="opt-forgot-b" />
        <AuthSwitch prompt="Remembered it?" href="/login">
          Sign in
        </AuthSwitch>
      </div>
    </SplitShell>
  );
}

/** C: first ask how they sign in, so a Google user never waits for an email that can't help. */
export function AuthForgotPasswordOptionC() {
  return (
    <FocusShell path="/forgot-password">
      <AuthHeading
        title={
          <>
            Reset your <span className="italic">password</span>
          </>
        }
      >
        How do you usually sign in?
      </AuthHeading>
      <Tabs defaultValue="email">
        <TabsList aria-label="How you sign in">
          <TabsTrigger value="email">With email</TabsTrigger>
          <TabsTrigger value="google">With Google</TabsTrigger>
        </TabsList>
        <TabsContent value="email">
          <div className="flex flex-col gap-4 pt-4">
            <ResetForm id="opt-forgot-c" />
            <p className="type-body-sm text-text-2">
              Open the link in this browser. It works once.
            </p>
          </div>
        </TabsContent>
        <TabsContent value="google">
          <div className="flex flex-col gap-4 pt-4">
            <AuthNotice title="There's no password to reset">
              Accounts made with Google sign in through Google.
            </AuthNotice>
            <GoogleButton />
          </div>
        </TabsContent>
      </Tabs>
      <AuthSwitch prompt="Remembered it?" href="/login">
        Sign in
      </AuthSwitch>
    </FocusShell>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// /update-password

/** The new-password field with the length rule checked as you type, so the error never comes after submit. */
function NewPasswordField({ id }: { id: string }) {
  const [value, setValue] = useState("");
  const long = value.length >= MIN_PASSWORD;
  return (
    <Field>
      <FieldLabel htmlFor={id}>New password</FieldLabel>
      <Input
        id={id}
        type="password"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <FieldDescription>
        <span className="inline-flex items-center gap-1.5">
          {long ? <CheckCircleIcon weight="fill" aria-hidden /> : <CircleIcon aria-hidden />}
          At least {MIN_PASSWORD} characters{value ? ` (${value.length} so far)` : ""}.
        </span>
      </FieldDescription>
    </Field>
  );
}

function UpdateForm({ id }: { id: string }) {
  return (
    <AuthCard>
      <FieldGroup>
        <NewPasswordField id={id} />
        <Button size="lg">Save password</Button>
      </FieldGroup>
    </AuthCard>
  );
}

/** A: the real layout, with the reset checklist on its last step and the live length check. */
export function AuthUpdatePasswordOptionA() {
  return (
    <AuthFrame path="/update-password" scene="password">
      <AuthHeading
        title={
          <>
            Set a new <span className="italic">password</span>
          </>
        }
      />
      <Checklist label="Resetting your password" steps={RESET_STEPS} current={2} />
      <div className="flex flex-col gap-4">
        <UpdateForm id="opt-update-a" />
        <AuthSwitch prompt="Link expired?" href="/forgot-password">
          Request a new one
        </AuthSwitch>
      </div>
    </AuthFrame>
  );
}

/** B: the form, and beside it the dashboard the learner lands on, with its meter explained. */
export function AuthUpdatePasswordOptionB() {
  return (
    <SplitShell
      path="/update-password"
      aside={
        <>
          <PanelHeading eyebrow="Next: your dashboard">Read your meter</PanelHeading>
          <Card>
            <CardHeader>
              <CardTitle>Explained 9 · owned 2 of 30</CardTitle>
              <CardDescription>An example, not your numbers.</CardDescription>
            </CardHeader>
            <CardContent>
              <Glossary />
            </CardContent>
          </Card>
          <Item variant="outline">
            <ItemMedia variant="icon">
              <ArrowRightIcon aria-hidden />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Then open Review</ItemTitle>
              <ItemDescription>Cards due today, never more than 5.</ItemDescription>
            </ItemContent>
          </Item>
        </>
      }
    >
      <AuthHeading
        title={
          <>
            Set a new <span className="italic">password</span>
          </>
        }
      >
        Choose the password you&apos;ll sign in with from now on.
      </AuthHeading>
      <div className="flex flex-col gap-4">
        <UpdateForm id="opt-update-b" />
        <AuthSwitch prompt="Link expired?" href="/forgot-password">
          Request a new one
        </AuthSwitch>
      </div>
    </SplitShell>
  );
}

/** C: one field. The only extra is the line that says where Save takes you. */
export function AuthUpdatePasswordOptionC() {
  return (
    <FocusShell path="/update-password">
      <div className="flex flex-col items-center gap-4 text-center">
        <LockKeyIcon weight="duotone" aria-hidden className="size-10 text-text-2" />
        <AuthHeading
          title={
            <>
              Set a new <span className="italic">password</span>
            </>
          }
        />
      </div>
      <UpdateForm id="opt-update-c" />
      <p className="type-body-sm text-text-2">
        Save takes you to your dashboard. Your cards and their schedule are unchanged.
      </p>
      <AuthSwitch prompt="Link expired?" href="/forgot-password">
        Request a new one
      </AuthSwitch>
    </FocusShell>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// /auth/error. Copy from app/auth/error/page.tsx; the preview shows the link_expired code.

const EXPIRED = {
  title: "This link was already used or has expired",
  body: "Each email link works once. If you opened it before, your account may already be confirmed: try signing in.",
};

const ERROR_CASES = [
  {
    title: "A confirm link from sign-up",
    body: "You may be confirmed already. If not, signing in sends a new link.",
    href: "/login",
    action: "Sign in",
  },
  {
    title: "A reset link",
    body: "It works once, in the browser you asked from. Ask again here.",
    href: "/forgot-password",
    action: "Reset password",
  },
] as const;

function ErrorHeading() {
  return (
    <AuthHeading
      title={
        <>
          That didn&apos;t <span className="italic">work</span>
        </>
      }
    />
  );
}

/** A: the real layout. "Which link did you open?" as a short checklist, each row with its own next step. */
export function AuthErrorOptionA() {
  return (
    <AuthFrame path="/auth/error?code=link_expired" scene="error">
      <ErrorHeading />
      <AuthNotice title={EXPIRED.title} fail>
        {EXPIRED.body}
      </AuthNotice>
      <div className="flex flex-col gap-3">
        <p className="type-label text-text-1">Which link did you open?</p>
        <ItemGroup>
          {ERROR_CASES.map((row) => (
            <Item key={row.title} variant="outline" size="sm">
              <ItemContent>
                <ItemTitle>{row.title}</ItemTitle>
                <ItemDescription>{row.body}</ItemDescription>
              </ItemContent>
              <Link
                href={row.href}
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                {row.action}
              </Link>
            </Item>
          ))}
        </ItemGroup>
      </div>
    </AuthFrame>
  );
}

/** B: the error and its fix on the left; on the right, why links work once and what the failure didn't touch. */
export function AuthErrorOptionB() {
  return (
    <SplitShell
      path="/auth/error?code=link_expired"
      aside={
        <>
          <PanelHeading eyebrow="Why this happens">Email links work once</PanelHeading>
          <p className="type-body text-pretty text-text-2">
            Each link in our emails works once and expires after a while. Reset links also work only
            in the browser you asked from. Opening one twice lands here.
          </p>
          <Item variant="outline">
            <ItemMedia variant="icon">
              <SealCheckIcon weight="duotone" aria-hidden />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Nothing you learned changed</ItemTitle>
              <ItemDescription>
                Your cards, their days in the schedule and what you&apos;ve explained and owned are
                as you left them.
              </ItemDescription>
            </ItemContent>
          </Item>
        </>
      }
    >
      <ErrorHeading />
      <AuthNotice title={EXPIRED.title} fail>
        {EXPIRED.body}
      </AuthNotice>
      <div className="flex flex-wrap gap-3">
        <Link href="/login" className={buttonVariants({ size: "lg" })}>
          Sign in
        </Link>
        <Link
          href="/forgot-password"
          className={buttonVariants({ variant: "secondary", size: "lg" })}
        >
          Reset password
        </Link>
      </div>
    </SplitShell>
  );
}

/** C: one next action picked from the code. The other routes wait behind a fold. */
export function AuthErrorOptionC() {
  return (
    <FocusShell path="/auth/error?code=link_expired">
      <div className="flex flex-col items-center gap-4 text-center">
        <LinkBreakIcon weight="duotone" aria-hidden className="size-10 text-text-2" />
        <AuthHeading title={EXPIRED.title} />
        <p className="type-body text-pretty text-text-2">
          Most likely you&apos;re already confirmed. Sign in to find out.
        </p>
        <Link href="/login" className={buttonVariants({ size: "lg" })}>
          Sign in
        </Link>
      </div>
      <Fold title="It was a reset link" summary="Ask again here">
        <ItemGroup>
          {ERROR_CASES.slice(1).map((row) => (
            <Item key={row.title} size="sm">
              <ItemContent>
                <ItemTitle>{row.title}</ItemTitle>
                <ItemDescription>{row.body}</ItemDescription>
              </ItemContent>
              <Link href={row.href} className={buttonVariants({ variant: "link" })}>
                {row.action}
              </Link>
            </Item>
          ))}
        </ItemGroup>
      </Fold>
    </FocusShell>
  );
}
