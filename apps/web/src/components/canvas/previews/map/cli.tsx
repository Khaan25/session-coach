"use client";

// The CLI half and the browser half of `session-coach login`, for the app map. Terminal lines from
// packages/cli/src/cli.ts and push.ts; the /cli/approve states from app/(app)/cli/approve/page.tsx and
// components/cli/approve-request.tsx. The pending question itself is the picked option (C), in options/onboarding.tsx.

import { ErrorState } from "@/components/app/error-state";
import { EmptyState } from "@/components/app/empty-state";
import { ApproveHeader } from "@/components/cli/approve-request";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { AppFrame } from "../frames";
import { Terminal } from "../parts";
import { DEVICE_CODE } from "../prototype-data";

const ORIGIN = "https://coach.ziaa.me";
const CONFIG = "~/.session-coach/config.json";
const LOGIN = [
  "$ npx session-coach login",
  `Your code: ${DEVICE_CODE}`,
  `Opening ${ORIGIN}/cli/approve?code=${DEVICE_CODE}`,
  "If the browser doesn't open, visit that address and check the code matches.",
  "Waiting for you to approve in the browser... (Ctrl+C to cancel)",
];

export type TerminalStep = "waiting" | "signed-in" | "expired" | "denied" | "push";

const TERMINAL: Record<TerminalStep, string[]> = {
  waiting: LOGIN,
  "signed-in": [
    ...LOGIN,
    `Signed in as sam@example.com. Saved to ${CONFIG}.`,
    "Next: session-coach push --latest",
  ],
  expired: [
    ...LOGIN,
    "The code expired after 10 minutes. Nothing was saved. Run session-coach login again.",
  ],
  denied: [...LOGIN, "The login was denied in the browser. Nothing was saved."],
  push: [
    "$ npx session-coach push --latest",
    "Pushing 7f3a2c91-4b6e-4d21-9a0f-3c5e8b1d2a47.jsonl (412 KB)",
    "Uploaded. Cards will appear in the app.",
    "Session id: 7f3a2c91",
  ],
};

export function MapCliTerminal({ step }: { step: TerminalStep }) {
  return (
    <div className="p-4">
      <Terminal lines={TERMINAL[step]} />
    </div>
  );
}

export type ApproveState =
  | "approved"
  | "denied"
  | "expired"
  | "already-approved"
  | "used"
  | "missing"
  | "unknown"
  | "rate-limited"
  | "lookup-failed";

/** Every answer but the pending question: the header, then one card that says what happened and what to do. */
const RESULT: Record<
  Exclude<ApproveState, "missing" | "unknown">,
  { word?: string; title: string; message: string; ok?: boolean; fail?: boolean }
> = {
  approved: {
    ok: true,
    title: "CLI connected",
    message:
      "Go back to your terminal. sams-mbp (macOS) signs in within a few seconds, and it shows up under Connected devices on Setup.",
  },
  denied: {
    ok: true,
    title: "Login denied",
    message:
      "That computer wasn't signed in. If you didn't run session-coach login yourself, nothing else is needed.",
  },
  expired: {
    word: "Expired",
    title: "This code expired",
    message: "Run session-coach login again for a new one.",
  },
  "already-approved": {
    word: "Approved",
    title: "Already approved",
    message: "Go back to your terminal; it signs in on its next check.",
  },
  used: {
    word: "Used",
    title: "Already used",
    message:
      "That login already has its token. Run session-coach login again to connect another computer.",
  },
  "rate-limited": {
    word: "Slow down",
    title: "Too many codes",
    message: "Too many CLI login requests in the last hour. Try again in 14 minutes.",
  },
  "lookup-failed": {
    fail: true,
    title: "Couldn't look up that code",
    message: "Reload the page to try again.",
  },
};

/** The code form: no code in the URL, or one that matched nothing. */
function CodeForm({ code, error }: { code?: string; error?: string }) {
  return (
    <>
      <ApproveHeader />
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Enter the code from your terminal</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor={`map-cli-code-${code ?? "empty"}`}>Code</FieldLabel>
              <Input
                id={`map-cli-code-${code ?? "empty"}`}
                defaultValue={code}
                placeholder="XXXX-XXXX"
                autoComplete="off"
                aria-invalid={error ? true : undefined}
              />
              <FieldDescription>
                {error ?? "session-coach login prints it, like WDJB-MJHT."}
              </FieldDescription>
            </Field>
            <div>
              <Button>Continue</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export function MapCliApprove({ state }: { state: ApproveState }) {
  const path = state === "missing" ? "/cli/approve" : `/cli/approve?code=${DEVICE_CODE}`;
  let body: React.ReactNode;
  if (state === "missing") body = <CodeForm />;
  else if (state === "unknown")
    body = (
      <CodeForm
        code="WDJB-MJHX"
        error="No login has that code. Check your terminal, or run session-coach login again."
      />
    );
  else {
    const copy = RESULT[state];
    body = (
      <>
        <ApproveHeader />
        <Card>
          {copy.ok ? (
            <EmptyState variant="plain" title={copy.title} description={copy.message} />
          ) : (
            <ErrorState
              variant="plain"
              status={copy.fail ? "fail" : "warn"}
              statusWord={copy.word}
              title={copy.title}
              message={copy.message}
              action={copy.fail && <Button variant="secondary">Try again</Button>}
            />
          )}
        </Card>
      </>
    );
  }
  return (
    <AppFrame path={path} crumb="Connect the CLI" sessions={[]} dueCount={0}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-(--gutter) py-16">{body}</div>
    </AppFrame>
  );
}
