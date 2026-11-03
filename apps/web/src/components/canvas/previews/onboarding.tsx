"use client";

// The way in: the marketing home, the auth screens, the one-click CLI login and the /setup page with "set up with
// your AI". The auth forms post to Server Actions, so their look is rebuilt here from the same primitives.

import {
  AsteriskIcon,
  CardsIcon,
  CursorIcon,
  LaptopIcon,
  OpenAiLogoIcon,
  SparkleIcon,
  type Icon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { createContext, useContext } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { Container } from "@/components/app/container";
import { AppPageHeader } from "@/components/app/page-header";
import { AuthNotice } from "@/components/auth/auth-notice";
import { AuthCard, AuthHeading, AuthStatus, AuthSwitch } from "@/components/auth/auth-parts";
import { GoogleIcon } from "@/components/auth/google-icon";
import { HandUnderline } from "@/components/marketing/hand-underline";
import { MIN_PASSWORD } from "@/lib/auth/validate";
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
import { CodeBlock } from "@/components/ui/code-block";
import { CopyButton } from "@/components/ui/copy-button";
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
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AppFrame, AuthFrame, PublicFrame } from "./frames";
import { IdeaNote, Terminal } from "./parts";

const CODE = "WDJB-MJHT";

/**
 * The hero's product object. The real DecisionCardPreview imports the shared fixture, answer key included, so it is
 * rendered on the server by the canvas page and handed down here instead of being bundled into this client module.
 */
export const HeroCard = createContext<React.ReactNode>(null);

/** The marketing home, signed out: the hero down to the product object. */
export function MarketingHomePreview() {
  const card = useContext(HeroCard);
  return (
    <PublicFrame path="/">
      <section className="relative isolate overflow-hidden">
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-80 well sm:h-96">
          <svg className="size-full text-line-row">
            <defs>
              <pattern id="canvas-ruled-lines" width="8" height="28" patternUnits="userSpaceOnUse">
                <line x1="0" y1="27.5" x2="8" y2="27.5" stroke="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#canvas-ruled-lines)" />
          </svg>
        </div>
        <div className="mx-auto flex w-full max-w-(--container) flex-col items-center px-(--gutter-sm) pt-20 pb-20 text-center sm:px-(--gutter) sm:pt-30 sm:pb-30">
          <h1 className="max-w-4xl font-display text-5xl leading-none tracking-tight text-balance text-text-1 sm:text-7xl lg:text-8xl">
            <span className="relative inline-block italic">
              Explain
              <HandUnderline className="absolute inset-x-0 top-full -mt-1 h-3 w-full text-accent-line sm:h-4" />
            </span>{" "}
            the code your agent wrote.
          </h1>
          <p className="mt-8 max-w-lg type-body-lg text-pretty text-text-2 sm:mt-10">
            Explain back the decisions your coding agent made. Each session becomes up to 5 decision
            cards, due again on day 1, 3 and 7.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link href="/how-it-works" className={buttonVariants({ size: "lg" })}>
              <CardsIcon weight="duotone" data-icon="inline-start" aria-hidden />
              See how it works
            </Link>
            <p className="type-body-sm text-text-2">
              Free during the trial. Built for Claude Code sessions.
            </p>
          </div>
          <div className="mt-16 w-full sm:mt-20">{card}</div>
        </div>
      </section>
    </PublicFrame>
  );
}

function GoogleButton() {
  return (
    <Button variant="secondary" size="lg">
      <GoogleIcon />
      Continue with Google
    </Button>
  );
}

export function SignUpPreview() {
  return (
    <AuthFrame path="/sign-up" scene="sign-up">
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
        <AuthCard>
          <FieldGroup>
            <GoogleButton />
            <FieldSeparator>or</FieldSeparator>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="canvas-signup-name">Name (optional)</FieldLabel>
                <Input id="canvas-signup-name" defaultValue="Sam Rivera" />
              </Field>
              <Field>
                <FieldLabel htmlFor="canvas-signup-email">Email</FieldLabel>
                <Input id="canvas-signup-email" type="email" defaultValue="sam@example.com" />
              </Field>
              <Field>
                <FieldLabel htmlFor="canvas-signup-password">Password</FieldLabel>
                <Input id="canvas-signup-password" type="password" />
                <FieldDescription>At least {MIN_PASSWORD} characters.</FieldDescription>
              </Field>
              <Button size="lg">Create account</Button>
            </FieldGroup>
          </FieldGroup>
        </AuthCard>
        <AuthSwitch prompt="Already have an account?" href="/login">
          Sign in
        </AuthSwitch>
      </div>
    </AuthFrame>
  );
}

export function LoginPreview({ error }: { error?: boolean }) {
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
        <AuthCard>
          <FieldGroup>
            <GoogleButton />
            <FieldSeparator>or</FieldSeparator>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`canvas-login-email-${!!error}`}>Email</FieldLabel>
                <Input
                  id={`canvas-login-email-${!!error}`}
                  type="email"
                  defaultValue={error ? "sam@example.com" : ""}
                />
              </Field>
              <Field>
                <div className="flex items-baseline justify-between gap-3">
                  <FieldLabel htmlFor={`canvas-login-password-${!!error}`}>Password</FieldLabel>
                  <Link href="/forgot-password" className={buttonVariants({ variant: "link" })}>
                    Forgot password?
                  </Link>
                </div>
                <Input id={`canvas-login-password-${!!error}`} type="password" />
              </Field>
              <Button size="lg">Sign in</Button>
            </FieldGroup>
          </FieldGroup>
        </AuthCard>
        <AuthStatus>
          {error && (
            <AuthNotice title="Couldn't sign in" fail>
              That email and password don&rsquo;t match. Try again or reset your password.
            </AuthNotice>
          )}
        </AuthStatus>
        <AuthSwitch prompt="New to Session Coach?" href="/sign-up">
          Create an account
        </AuthSwitch>
      </div>
    </AuthFrame>
  );
}

export function CheckEmailPreview() {
  return (
    <AuthFrame path="/sign-up/check-email" scene="email">
      <AuthHeading
        title={
          <>
            Check your <span className="italic">email</span>
          </>
        }
      >
        If that address can sign up, we sent it a link to confirm the account. Open the link on this
        device to finish.
      </AuthHeading>
      <div className="flex flex-col items-start gap-2">
        <Button variant="secondary" disabled>
          Resend in 42 s
        </Button>
      </div>
      <AuthSwitch prompt="Already confirmed?" href="/login">
        Sign in
      </AuthSwitch>
    </AuthFrame>
  );
}

export function ForgotPasswordPreview() {
  return (
    <AuthFrame path="/forgot-password" scene="password">
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
        <AuthCard>
          <FieldGroup>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="canvas-forgot-email">Email</FieldLabel>
                <Input id="canvas-forgot-email" type="email" />
              </Field>
              <Button size="lg">Send reset link</Button>
            </FieldGroup>
            <FieldSeparator>or, if you signed up with Google</FieldSeparator>
            <GoogleButton />
          </FieldGroup>
        </AuthCard>
        <AuthSwitch prompt="Remembered it?" href="/login">
          Sign in
        </AuthSwitch>
      </div>
    </AuthFrame>
  );
}

export function UpdatePasswordPreview() {
  return (
    <AuthFrame path="/update-password" scene="password">
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
        <AuthCard>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="canvas-update-password">New password</FieldLabel>
              <Input id="canvas-update-password" type="password" />
              <FieldDescription>At least {MIN_PASSWORD} characters.</FieldDescription>
            </Field>
            <Button size="lg">Save password</Button>
          </FieldGroup>
        </AuthCard>
        <AuthSwitch prompt="Link expired?" href="/forgot-password">
          Request a new one
        </AuthSwitch>
      </div>
    </AuthFrame>
  );
}

type LoginStep = "waiting" | "done" | "expired";

/** `npx session-coach login` with no token to paste: it opens the browser and waits for one click. */
export function CliLoginTerminal({ step }: { step: LoginStep }) {
  const lines = [
    "$ npx session-coach login",
    "",
    `Your code: ${CODE}`,
    "Opening https://coach.ziaa.me/cli/approve?code=" + CODE,
  ];
  if (step === "waiting") lines.push("", "Waiting for you to approve in the browser...");
  if (step === "done")
    lines.push(
      "",
      "Approved. Signed in as sam@example.com (Sam Rivera).",
      "Token saved to ~/.session-coach/config.json",
      "",
      "Next: session-coach push --latest",
    );
  if (step === "expired")
    lines.push(
      "",
      "The code expired after 10 minutes. Nothing was saved.",
      "Run session-coach login again.",
    );
  return (
    <div className="flex flex-col gap-3 p-4">
      <Terminal lines={lines} />
      <IdeaNote>
        {step === "waiting"
          ? "Device-code login: the CLI asks the server for a code, opens the browser and polls. No token to copy."
          : step === "done"
            ? "The server creates a named CLI token for this device and hands it to the polling CLI once."
            : "Codes expire after 10 minutes and work once, so a leaked code is useless later."}
      </IdeaNote>
    </div>
  );
}

/** The browser half of the login, on the auth layout: the learner is already signed in, so it is one click. */
export function CliApprovePreview({ step }: { step: "ask" | "approved" | "signed-out" }) {
  return (
    <AuthFrame path={`/cli/approve?code=${CODE}`} scene="sign-in">
      {step === "signed-out" ? (
        <>
          <AuthHeading
            title={
              <>
                Sign in to connect the <span className="italic">CLI</span>
              </>
            }
          >
            After you sign in, you come straight back here to approve.
          </AuthHeading>
          <AuthCard>
            <FieldGroup>
              <GoogleButton />
              <FieldSeparator>or</FieldSeparator>
              <Link
                href={`/login?next=${encodeURIComponent(`/cli/approve?code=${CODE}`)}`}
                className={buttonVariants({ size: "lg" })}
              >
                Sign in with email
              </Link>
            </FieldGroup>
          </AuthCard>
        </>
      ) : step === "ask" ? (
        <>
          <AuthHeading
            title={
              <>
                Connect the <span className="italic">CLI</span>
              </>
            }
          >
            Check the code matches the one in your terminal.
          </AuthHeading>
          <AuthCard>
            <FieldGroup>
              <span className="type-stat tabular-nums">{CODE}</span>
              <span className="type-body-sm text-text-2">
                session-coach 0.2.0 on macOS · signed in as sam@example.com
              </span>
              <Button size="lg">Connect</Button>
              <Button variant="secondary" size="lg">
                Cancel
              </Button>
            </FieldGroup>
          </AuthCard>
        </>
      ) : (
        <>
          <AuthHeading
            title={
              <>
                CLI <span className="italic">connected</span>
              </>
            }
          >
            You can close this tab. Your terminal is signed in.
          </AuthHeading>
          <AuthStatus>
            <AuthNotice title="Signed in as Sam Rivera">
              The terminal picks up its token on its next check, within 5 seconds.
            </AuthNotice>
          </AuthStatus>
        </>
      )}
      <IdeaNote>
        {step === "signed-out"
          ? "Not signed in: log in first, then land back on the approve page with the code kept."
          : "One click instead of create token, copy, paste. Same as GitHub CLI and Vercel CLI."}
      </IdeaNote>
    </AuthFrame>
  );
}

type Agent = { id: string; name: string; icon: Icon; file: string };

export const AGENTS: Agent[] = [
  {
    id: "claude",
    name: "Claude Code",
    icon: AsteriskIcon,
    file: ".claude/settings.json in this project (SessionEnd hook)",
  },
  { id: "codex", name: "Codex", icon: OpenAiLogoIcon, file: "~/.codex/config.toml (notify hook)" },
  { id: "gemini", name: "Gemini CLI", icon: SparkleIcon, file: "~/.gemini/settings.json (hooks)" },
  { id: "cursor", name: "Cursor", icon: CursorIcon, file: ".cursor/hooks.json (stop hook)" },
];

export const promptFor = (agent: Agent) =>
  `Set up Session Coach for me.
1. Run: npx session-coach@latest login  (it opens my browser; wait until I approve)
2. Add an auto-upload hook so each ${agent.name} session is pushed when it ends: ${agent.file}
   Command: npx session-coach push --latest --quiet
   Only for this project, and skip sessions under 5 minutes.
3. Run: npx session-coach push --latest  and show me the result.
Don't paste any token or secret into this chat.`;

const SETUP_TITLE = "Setup";
const SETUP_DESCRIPTION = "Connect Claude Code, so each session you finish becomes decision cards.";

/** /setup: copy one prompt into the agent you use, and it does the install, login and hook. */
export function AiSetupPreview() {
  return (
    <AppFrame path="/setup">
      <Container>
        <AppPageHeader title={SETUP_TITLE} description={SETUP_DESCRIPTION} />
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Set up with your AI</h2>
            </CardTitle>
            <CardDescription>
              Copy the prompt, paste it into your agent, approve once in the browser. About a
              minute.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="claude">
              <TabsList>
                {AGENTS.map(({ id, name, icon: AgentIcon }) => (
                  <TabsTrigger key={id} value={id}>
                    <AgentIcon aria-hidden="true" />
                    {name}
                  </TabsTrigger>
                ))}
              </TabsList>
              {AGENTS.map((agent) => (
                <TabsContent key={agent.id} value={agent.id}>
                  <div className="flex flex-col gap-3 pt-3">
                    <pre className="overflow-auto well p-4 type-code-sm whitespace-pre-wrap text-text-1">
                      {promptFor(agent)}
                    </pre>
                    <CopyButton value={promptFor(agent)} label="Prompt" />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Prefer a terminal?</h2>
            </CardTitle>
            <CardDescription>The same two steps by hand. Needs Node 20 or later.</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock
              variant="command"
              command={["npx session-coach login", "npx session-coach push --latest"]}
            />
          </CardContent>
        </Card>
        <IdeaNote>
          The prompt never holds a token: login happens in the browser. Swap the stand-in icons for
          the real brand marks before shipping.
        </IdeaNote>
      </Container>
    </AppFrame>
  );
}

const DEVICES = [
  {
    name: "MacBook Pro",
    version: "session-coach 0.2.0",
    used: "Last push 12 minutes ago",
    hook: true,
  },
  {
    name: "Work desktop",
    version: "session-coach 0.1.1",
    used: "Last push 6 days ago",
    hook: false,
  },
];

/** /setup once the CLI is connected: who you are, and every device that signed in. */
export function DevicesPreview({ empty }: { empty?: boolean }) {
  return (
    <AppFrame path="/setup">
      <Container>
        <AppPageHeader title={SETUP_TITLE} description={SETUP_DESCRIPTION} />
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Connected devices</h2>
            </CardTitle>
            <CardDescription>
              Signed in as Sam Rivera (sam@example.com · github: samr). Disconnect one to sign it
              out.
            </CardDescription>
            <CardAction>
              <Badge variant={empty ? "outline" : "success"}>
                {empty ? "No CLI yet" : "CLI connected"}
              </Badge>
            </CardAction>
          </CardHeader>
          {empty ? (
            <EmptyState
              variant="plain"
              title="No computer connected yet"
              description="Run the setup prompt in your agent, or run npx session-coach login yourself."
            />
          ) : (
            <ItemGroup aria-label="Connected devices">
              {DEVICES.map((d) => (
                // ItemGroup is a div with role="list", so the row takes the matching role.
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
                <Item key={d.name} role="listitem">
                  <ItemMedia variant="icon">
                    <LaptopIcon aria-hidden="true" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>
                      {d.name} · {d.version}
                    </ItemTitle>
                    <ItemDescription>
                      <span className="flex flex-wrap gap-x-3">
                        <span>{d.used}</span>
                        <span>{d.hook ? "Auto-upload on" : "Auto-upload off"}</span>
                      </span>
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button variant="secondary" size="sm">
                      Disconnect
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          )}
        </Card>
        <IdeaNote>
          The learner&rsquo;s name comes from their profile and GitHub login, so the CLI can greet
          them by name. Each device is the CLI token it signed in with.
        </IdeaNote>
      </Container>
    </AppFrame>
  );
}

/** Right after setup: the page waits for the first session and updates live when it lands. */
export function FirstPushWaitingPreview() {
  return (
    <AppFrame path="/setup" sessions={[]} dueCount={0}>
      <Container>
        <AppPageHeader title={SETUP_TITLE} description={SETUP_DESCRIPTION} />
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="flex items-center gap-2">
                <Spinner />
                Waiting for your first session
              </h2>
            </CardTitle>
            <CardDescription>
              Finish any Claude Code session in a project with the hook on. Its cards appear here in
              about a minute.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel>Or push one now</FieldLabel>
              <CodeBlock variant="command" command="npx session-coach push --latest" />
              <FieldDescription>Uploads your most recent session in this folder.</FieldDescription>
            </Field>
          </CardContent>
        </Card>
      </Container>
    </AppFrame>
  );
}
