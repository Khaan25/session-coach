"use client";

// Sign-up, the one-click CLI login and the /setup page with "set up with your AI".

import {
  AsteriskIcon,
  CheckCircleIcon,
  CursorIcon,
  GoogleLogoIcon,
  LaptopIcon,
  OpenAiLogoIcon,
  SparkleIcon,
  type Icon,
} from "@phosphor-icons/react";

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
import { CopyButton } from "@/components/ui/copy-button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { IdeaNote, Screen, Terminal } from "./parts";

const CODE = "WDJB-MJHT";

export function SignUpPreview({ error }: { error?: boolean }) {
  return (
    <Screen path={error ? "/login" : "/sign-up"}>
      <Card>
        <CardHeader>
          <CardTitle>{error ? "Sign in" : "Create your account"}</CardTitle>
          <CardDescription>
            Explain your agent&rsquo;s decisions back in 2 minutes a day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Button variant="secondary">
              <GoogleLogoIcon aria-hidden="true" />
              Continue with Google
            </Button>
            <Field data-invalid={error || undefined}>
              <FieldLabel htmlFor={`email-${error ? "e" : "s"}`}>Email</FieldLabel>
              <Input
                id={`email-${error ? "e" : "s"}`}
                type="email"
                defaultValue="sam@example.com"
              />
            </Field>
            <Field data-invalid={error || undefined}>
              <FieldLabel htmlFor={`pw-${error ? "e" : "s"}`}>Password</FieldLabel>
              <Input id={`pw-${error ? "e" : "s"}`} type="password" defaultValue="example-only" />
              {error && (
                <FieldError>
                  That email and password don&rsquo;t match. Try again or reset your password.
                </FieldError>
              )}
            </Field>
          </div>
        </CardContent>
        <CardFooter>
          <Button>{error ? "Sign in" : "Create account"}</Button>
        </CardFooter>
      </Card>
    </Screen>
  );
}

export function CheckEmailPreview() {
  return (
    <Screen path="/sign-up/check-email">
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a link to sam@example.com. Open it on this device to finish signing up.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="secondary">Send it again</Button>
        </CardFooter>
      </Card>
    </Screen>
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
      "Token saved to ~/.config/session-coach/config.json",
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

/** The browser half of the login: the learner is already signed in, so it is one click. */
export function CliApprovePreview({ step }: { step: "ask" | "approved" | "signed-out" }) {
  return (
    <Screen path={`/cli/approve?code=${CODE}`}>
      {step === "signed-out" ? (
        <Card>
          <CardHeader>
            <CardTitle>Sign in to connect the CLI</CardTitle>
            <CardDescription>
              After you sign in, you come straight back here to approve.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button>Sign in</Button>
          </CardFooter>
        </Card>
      ) : step === "ask" ? (
        <Card>
          <CardHeader>
            <CardTitle>Connect the CLI on this computer?</CardTitle>
            <CardDescription>Check the code matches the one in your terminal.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <span className="type-stat tabular-nums">{CODE}</span>
              <span className="type-body-sm text-text-2">
                session-coach 0.2.0 on macOS · signed in as sam@example.com
              </span>
            </div>
          </CardContent>
          <CardFooter>
            <div className="flex gap-2">
              <Button>Connect</Button>
              <Button variant="secondary">Cancel</Button>
            </div>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <CheckCircleIcon aria-hidden="true" />
                CLI connected
              </span>
            </CardTitle>
            <CardDescription>You can close this tab. Your terminal is signed in.</CardDescription>
          </CardHeader>
        </Card>
      )}
      <IdeaNote>
        {step === "signed-out"
          ? "Not signed in: log in first, then land back on the approve page with the code kept."
          : "One click instead of create token, copy, paste. Same as GitHub CLI and Vercel CLI."}
      </IdeaNote>
    </Screen>
  );
}

type Agent = { id: string; name: string; icon: Icon; file: string };

export const AGENTS: Agent[] = [
  {
    id: "claude",
    name: "Claude Code",
    icon: AsteriskIcon,
    file: "~/.claude/settings.json (SessionEnd hook)",
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

/** /setup: copy one prompt into the agent you use, and it does the install, login and hook. */
export function AiSetupPreview() {
  return (
    <Screen path="/setup">
      <div className="flex flex-col gap-1">
        <span className="type-heading">Set up with your AI</span>
        <span className="type-body-sm text-text-2">
          Copy the prompt, paste it into your agent, approve once in the browser. About a minute.
        </span>
      </div>
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
      <IdeaNote>
        The prompt never holds a token: login happens in the browser. Prefer a terminal? Show the 2
        commands below it. Swap the stand-in icons for the real brand marks before shipping.
      </IdeaNote>
    </Screen>
  );
}

/** /setup once the CLI is connected: who you are, and every device with a token. */
export function DevicesPreview({ empty }: { empty?: boolean }) {
  return (
    <Screen path="/setup">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="type-heading-sm">Sam Rivera</span>
          <span className="type-body-sm text-text-2">sam@example.com · github: samr</span>
        </div>
        <Badge variant={empty ? "outline" : "success"}>
          {empty ? "No CLI yet" : "CLI connected"}
        </Badge>
      </div>
      {empty ? (
        <Card>
          <CardHeader>
            <CardTitle>No computer connected yet</CardTitle>
            <CardDescription>
              Run the prompt above in your agent, or run npx session-coach login yourself.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ItemGroup aria-label="Connected devices">
          {[
            {
              name: "MacBook Pro · session-coach 0.2.0",
              used: "Last push 12 minutes ago",
              hook: true,
            },
            {
              name: "Work desktop · session-coach 0.1.1",
              used: "Last push 6 days ago",
              hook: false,
            },
          ].map((d) => (
            <Item key={d.name} variant="outline">
              <LaptopIcon aria-hidden="true" />
              <ItemContent>
                <ItemTitle>{d.name}</ItemTitle>
                <ItemDescription>
                  {d.used} · {d.hook ? "auto-upload on" : "auto-upload off"}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button variant="ghost">Disconnect</Button>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      )}
      <IdeaNote>
        The learner&rsquo;s name comes from their profile and GitHub login, so the CLI can greet
        them by name.
      </IdeaNote>
    </Screen>
  );
}

/** Right after setup: the page waits for the first session and updates live when it lands. */
export function FirstPushWaitingPreview() {
  return (
    <Screen path="/setup">
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <Spinner />
              Waiting for your first session
            </span>
          </CardTitle>
          <CardDescription>
            Finish any Claude Code session in a project with the hook on. Its cards appear here in
            about a minute.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field>
            <FieldLabel>Or push one now</FieldLabel>
            <Terminal lines={["$ npx session-coach push --latest"]} />
            <FieldDescription>Uploads your most recent session in this folder.</FieldDescription>
          </Field>
        </CardContent>
      </Card>
    </Screen>
  );
}
