"use client";

// Everything on the ideas canvas. Add, rename or remove a preview here; the canvas itself needs no change.
// Each row is one area of the app, left to right in the order a learner meets it.

import { Canvas, type CanvasItem } from "./canvas";
import { DefendAnswerPreview, DefendResultPreview, DefendStartPreview } from "./previews/defend";
import {
  DashboardPreview,
  ReviewAnswerPreview,
  ReviewStatePreview,
  SessionPreview,
} from "./previews/learning";
import {
  EmailPreview,
  FlowPreview,
  ProgressPreview,
  ReportPreview,
  SettingsPreview,
} from "./previews/more";
import {
  AiSetupPreview,
  CheckEmailPreview,
  CliApprovePreview,
  CliLoginTerminal,
  DevicesPreview,
  FirstPushWaitingPreview,
  SignUpPreview,
} from "./previews/onboarding";
import { LearnerPrototype } from "./previews/prototype";

type Entry = Omit<CanvasItem, "x" | "y">;

const GAP = 80;

/** Lays a row out left to right from x = 0. Positions are only the starting layout; dragging saves new ones. */
function row(y: number, entries: Entry[]): CanvasItem[] {
  let x = 0;
  return entries.map((entry) => {
    const item = { ...entry, x, y };
    x += entry.width + GAP;
    return item;
  });
}

export const canvasItems: CanvasItem[] = [
  // The clickable prototype sits above the static rows, so it is the first thing to try.
  ...row(-1500, [
    {
      id: "prototype-learner-app",
      name: "Prototype · learner app",
      width: 1280,
      height: 860,
      render: () => <LearnerPrototype />,
    },
  ]),
  ...row(0, [
    {
      id: "flow-first-run",
      name: "Flow · first run",
      width: 440,
      height: 520,
      render: () => (
        <FlowPreview
          title="Zero to first card"
          steps={[
            { label: "Sign up", item: "signup" },
            { label: "Copy the AI setup prompt", item: "setup-ai" },
            { label: "CLI opens the browser", item: "cli-waiting" },
            { label: "Approve in one click", item: "cli-approve" },
            { label: "CLI is signed in", item: "cli-done" },
            { label: "First session processing", item: "session-processing" },
            { label: "Cards ready", item: "session-ready" },
          ]}
          note="No token to copy. The agent does the install and the hook."
        />
      ),
    },
    {
      id: "flow-daily",
      name: "Flow · daily loop",
      width: 440,
      height: 520,
      render: () => (
        <FlowPreview
          title="Two minutes a day"
          steps={[
            { label: "Email: yesterday added 4", item: "email" },
            { label: "Dashboard with meter and streak", item: "dashboard-full" },
            { label: "Answer first", item: "review-answer" },
            { label: "Scoring", item: "review-grading" },
            { label: "Result with the why", item: "review-result" },
            { label: "Or: I don't know yet", item: "review-dont-know" },
            { label: "Done for today", item: "review-caught-up" },
          ]}
          note="Capped at 5 cards. A missed day never resets anything."
        />
      ),
    },
    {
      id: "flow-defend",
      name: "Flow · defend it",
      width: 440,
      height: 520,
      render: () => (
        <FlowPreview
          title="Prove it, interview style"
          steps={[
            { label: "Pick a random owned decision", item: "defend-start" },
            { label: "Timed answer, paste off", item: "defend-answer" },
            { label: "AI follow-up", item: "defend-follow-up" },
            { label: "Defended", item: "defend-passed" },
            { label: "Shown on the report", item: "report-shared" },
          ]}
          note="Proof mode only. Practice stays relaxed."
        />
      ),
    },
  ]),
  ...row(700, [
    {
      id: "signup",
      name: "Sign up · form",
      width: 440,
      height: 600,
      render: () => <SignUpPreview />,
    },
    {
      id: "login-error",
      name: "Sign in · wrong password",
      width: 440,
      height: 620,
      render: () => <SignUpPreview error />,
    },
    {
      id: "check-email",
      name: "Sign up · check your email",
      width: 440,
      height: 340,
      render: () => <CheckEmailPreview />,
    },
    {
      id: "cli-waiting",
      name: "CLI login · waiting for approval",
      width: 560,
      height: 360,
      render: () => <CliLoginTerminal step="waiting" />,
    },
    {
      id: "cli-approve",
      name: "CLI login · approve in browser",
      width: 480,
      height: 520,
      render: () => <CliApprovePreview step="ask" />,
    },
    {
      id: "cli-signed-out",
      name: "CLI login · approve while signed out",
      width: 480,
      height: 380,
      render: () => <CliApprovePreview step="signed-out" />,
    },
    {
      id: "cli-approved",
      name: "CLI login · approved page",
      width: 480,
      height: 340,
      render: () => <CliApprovePreview step="approved" />,
    },
    {
      id: "cli-done",
      name: "CLI login · signed in",
      width: 560,
      height: 420,
      render: () => <CliLoginTerminal step="done" />,
    },
    {
      id: "cli-expired",
      name: "CLI login · code expired",
      width: 560,
      height: 380,
      render: () => <CliLoginTerminal step="expired" />,
    },
  ]),
  ...row(1500, [
    {
      id: "setup-ai",
      name: "Setup · set up with your AI",
      width: 680,
      height: 760,
      render: () => <AiSetupPreview />,
    },
    {
      id: "setup-devices",
      name: "Setup · connected devices",
      width: 560,
      height: 480,
      render: () => <DevicesPreview />,
    },
    {
      id: "setup-no-devices",
      name: "Setup · no device yet",
      width: 560,
      height: 400,
      render: () => <DevicesPreview empty />,
    },
    {
      id: "setup-first-push",
      name: "Setup · waiting for first session",
      width: 560,
      height: 480,
      render: () => <FirstPushWaitingPreview />,
    },
  ]),
  ...row(2400, [
    {
      id: "dashboard-full",
      name: "Dashboard · meter and streak",
      width: 640,
      height: 780,
      render: () => <DashboardPreview state="full" />,
    },
    {
      id: "dashboard-loading",
      name: "Dashboard · loading",
      width: 640,
      height: 560,
      render: () => <DashboardPreview state="loading" />,
    },
    {
      id: "dashboard-empty",
      name: "Dashboard · no sessions",
      width: 640,
      height: 560,
      render: () => <DashboardPreview state="empty" />,
    },
    {
      id: "dashboard-error",
      name: "Dashboard · load failed",
      width: 640,
      height: 480,
      render: () => <DashboardPreview state="error" />,
    },
    {
      id: "dashboard-offline",
      name: "Dashboard · offline",
      width: 640,
      height: 480,
      render: () => <DashboardPreview state="offline" />,
    },
  ]),
  ...row(3760, [
    {
      id: "session-ready",
      name: "Session · cards, why locked",
      width: 640,
      height: 1000,
      render: () => <SessionPreview state="ready" />,
    },
    {
      id: "session-processing",
      name: "Session · processing",
      width: 600,
      height: 480,
      render: () => <SessionPreview state="processing" />,
    },
    {
      id: "session-failed",
      name: "Session · failed",
      width: 600,
      height: 440,
      render: () => <SessionPreview state="failed" />,
    },
    {
      id: "session-no-cards",
      name: "Session · no cards",
      width: 600,
      height: 480,
      render: () => <SessionPreview state="no-cards" />,
    },
  ]),
  ...row(4900, [
    {
      id: "review-loading",
      name: "Review · queue loading",
      width: 560,
      height: 480,
      render: () => <ReviewStatePreview state="loading" />,
    },
    {
      id: "review-answer",
      name: "Review · answer first",
      width: 560,
      height: 660,
      render: () => <ReviewAnswerPreview />,
    },
    {
      id: "review-grading",
      name: "Review · scoring",
      width: 560,
      height: 300,
      render: () => <ReviewStatePreview state="grading" />,
    },
    {
      id: "review-result",
      name: "Review · result",
      width: 560,
      height: 680,
      render: () => <ReviewStatePreview state="result" />,
    },
    {
      id: "review-dont-know",
      name: "Review · I don't know yet",
      width: 560,
      height: 560,
      render: () => <ReviewStatePreview state="dont-know" />,
    },
    {
      id: "review-caught-up",
      name: "Review · done for today",
      width: 560,
      height: 480,
      render: () => <ReviewStatePreview state="caught-up" />,
    },
    {
      id: "review-failed",
      name: "Review · scoring failed",
      width: 560,
      height: 400,
      render: () => <ReviewStatePreview state="failed" />,
    },
    {
      id: "review-no-cards",
      name: "Review · no cards yet",
      width: 560,
      height: 480,
      render: () => <ReviewStatePreview state="no-cards" />,
    },
  ]),
  ...row(5800, [
    {
      id: "defend-start",
      name: "Defend it · start",
      width: 560,
      height: 520,
      render: () => <DefendStartPreview />,
    },
    {
      id: "defend-answer",
      name: "Defend it · timed answer, paste off",
      width: 600,
      height: 700,
      render: () => <DefendAnswerPreview />,
    },
    {
      id: "defend-follow-up",
      name: "Defend it · AI follow-up",
      width: 600,
      height: 760,
      render: () => <DefendAnswerPreview followUp />,
    },
    {
      id: "defend-passed",
      name: "Defend it · defended",
      width: 560,
      height: 560,
      render: () => <DefendResultPreview state="passed" />,
    },
    {
      id: "defend-time-up",
      name: "Defend it · time's up",
      width: 560,
      height: 560,
      render: () => <DefendResultPreview state="time-up" />,
    },
    {
      id: "defend-none",
      name: "Defend it · nothing owned yet",
      width: 560,
      height: 420,
      render: () => <DefendResultPreview state="none-owned" />,
    },
  ]),
  ...row(6740, [
    {
      id: "progress-full",
      name: "Progress · with data",
      width: 600,
      height: 720,
      render: () => <ProgressPreview />,
    },
    {
      id: "progress-empty",
      name: "Progress · no reviews yet",
      width: 600,
      height: 480,
      render: () => <ProgressPreview empty />,
    },
    {
      id: "report-off",
      name: "Report · off (opt-in)",
      width: 560,
      height: 340,
      render: () => <ReportPreview shared={false} />,
    },
    {
      id: "report-shared",
      name: "Report · shared link",
      width: 600,
      height: 820,
      render: () => <ReportPreview shared />,
    },
    {
      id: "settings",
      name: "Settings · profile",
      width: 560,
      height: 820,
      render: () => <SettingsPreview />,
    },
    {
      id: "email",
      name: "Email · daily review",
      width: 560,
      height: 520,
      render: () => <EmailPreview />,
    },
  ]),
];

/** The page's only child: the canvas with every preview above. Client-side, since each entry renders a component. */
export function IdeasCanvas() {
  return <Canvas items={canvasItems} title="Session Coach ideas canvas" />;
}
