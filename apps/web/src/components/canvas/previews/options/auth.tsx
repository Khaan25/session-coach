"use client";

// Redesign options for the auth routes: three layouts per route, each teaching what Session Coach is while the
// learner signs in, signs up or recovers. A: the real auth layout with a guided checklist in the form column.
// B: the form on the left and an explain-as-you-go panel in place of the art. C: one focused task, with the
// explanation behind progressive disclosure. Synthetic data only; no answer key is ever shown.

import { ArrowRightIcon, CheckCircleIcon, CircleIcon, SealCheckIcon } from "@phosphor-icons/react";
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
import { Textarea } from "@/components/ui/textarea";

// ---------------------------------------------------------------------------------------------------------------
// Shells. B replaces the art, so it rebuilds the browser bar here.

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

/** A labelled fold: the explanation is one click away, not in the way. */

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

// ---------------------------------------------------------------------------------------------------------------
// /sign-up

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

// ---------------------------------------------------------------------------------------------------------------
// /forgot-password

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

// ---------------------------------------------------------------------------------------------------------------
// /auth/error. Copy from app/auth/error/page.tsx; the preview shows the link_expired code.

const EXPIRED = {
  title: "This link was already used or has expired",
  body: "Each email link works once. If you opened it before, your account may already be confirmed: try signing in.",
};

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
