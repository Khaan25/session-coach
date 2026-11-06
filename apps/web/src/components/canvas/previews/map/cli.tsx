"use client";

// The CLI half and the browser half of `session-coach login`, for the app map. The terminal lines are a copy of what
// packages/cli/src/cli.ts and push.ts print (a terminal can't be rendered here). The /cli/approve states are the real
// components in components/cli/approve-states.tsx; the pending question is ApproveRequest, in options/onboarding.tsx.

import {
  ApproveCodeForm,
  ApproveColumn,
  ApproveDone,
  ApproveNotice,
  SETTLED_COPY,
} from "@/components/cli/approve-states";
import { Button } from "@/components/ui/button";

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
    "Next: session-coach init, in each project whose sessions you want uploaded.",
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

/** Every answer but the pending question, from the real components the page renders. */
function ApproveBody({ state }: { state: ApproveState }) {
  switch (state) {
    case "missing":
      return <ApproveCodeForm />;
    case "unknown":
      return (
        <ApproveCodeForm
          code="WDJB-MJHX"
          error="No login has that code. Check your terminal, or run session-coach login again."
        />
      );
    case "approved":
    case "denied":
      return <ApproveDone done={state} clientName="sams-mbp (macOS)" />;
    case "already-approved":
      return <ApproveNotice {...SETTLED_COPY.approved} />;
    case "expired":
    case "used":
      return <ApproveNotice {...SETTLED_COPY[state]} />;
    case "rate-limited":
      return (
        <ApproveNotice
          word="Slow down"
          title="Too many codes"
          message="Too many CLI login requests in the last hour. Try again in 14 minutes."
        />
      );
    case "lookup-failed":
      return (
        <ApproveNotice
          title="Couldn't look up that code"
          message="Reload the page to try again."
          action={<Button variant="secondary">Try again</Button>}
        />
      );
  }
}

export function MapCliApprove({ state }: { state: ApproveState }) {
  const path = state === "missing" ? "/cli/approve" : `/cli/approve?code=${DEVICE_CODE}`;
  return (
    <AppFrame path={path} sessions={[]} dueCount={0}>
      <ApproveColumn>
        <ApproveBody state={state} />
      </ApproveColumn>
    </AppFrame>
  );
}
