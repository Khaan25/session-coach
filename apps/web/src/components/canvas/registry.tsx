"use client";

// Everything on the ideas canvas. Add, rename or remove a preview here; the canvas itself needs no change.
// Each row is one area of the app, left to right in the order a learner meets it.

import { Canvas, type CanvasItem } from "./canvas";
import { DefendAnswerPreview, DefendResultPreview, DefendStartPreview } from "./previews/defend";
import {
  ReportPublicEmptyPreview,
  ReportPublicOffPreview,
  ReportPublicPreview,
  ReportSettingsPreview,
} from "./previews/report";
import {
  DashboardPreview,
  ReviewAnswerPreview,
  ReviewQueuePreview,
  ReviewStatePreview,
  SessionPreview,
} from "./previews/learning";
import { EmailPreview, FlowPreview, ProgressPreview, SettingsPreview } from "./previews/more";
import {
  AiSetupPreview,
  CheckEmailPreview,
  CliApprovePreview,
  CliLoginTerminal,
  DevicesPreview,
  FirstPushWaitingPreview,
  ForgotPasswordPreview,
  HeroCard,
  LoginPreview,
  MarketingHomePreview,
  SignUpPreview,
  UpdatePasswordPreview,
} from "./previews/onboarding";
import { LearnerPrototype } from "./previews/prototype";
import { mapRows } from "./previews/map/rows";
import { optionRows } from "./previews/options/rows";

type Entry = Omit<CanvasItem, "x" | "y">;

/** Route previews are full pages at desktop size. */
const PAGE = { width: 1440, height: 900 };
/** The CLI's terminal transcripts. */
const TERMINAL = { width: 720, height: 460 };
const GAP = 120;
/** Between rows, below the tallest item; leaves room for the labels. */
const ROW_GAP = 320;

/**
 * Lays rows out top to bottom from y = `top`, each left to right from x = 0. Positions are only the starting layout;
 * dragging saves new ones.
 */
function stack(top: number, rows: Entry[][]): CanvasItem[] {
  let y = top;
  return rows.flatMap((entries) => {
    let x = 0;
    const items = entries.map((entry) => {
      const item = { ...entry, x, y };
      x += entry.width + GAP;
      return item;
    });
    y += Math.max(...entries.map((entry) => entry.height)) + ROW_GAP;
    return items;
  });
}

const currentItems: CanvasItem[] = [
  // The clickable prototype sits above the static rows, so it is the first thing to try.
  ...stack(-(PAGE.height + ROW_GAP), [
    [
      {
        id: "prototype-learner-app",
        name: "Prototype · learner app",
        ...PAGE,
        render: () => <LearnerPrototype />,
      },
    ],
  ]),
  ...stack(0, [
    [
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
    ],
    [
      {
        id: "marketing-home",
        name: "Home · signed out",
        ...PAGE,
        render: () => <MarketingHomePreview />,
      },
      {
        id: "signup",
        name: "Sign up · form",
        ...PAGE,
        render: () => <SignUpPreview />,
      },
      {
        id: "login",
        name: "Sign in · form",
        ...PAGE,
        render: () => <LoginPreview />,
      },
      {
        id: "login-error",
        name: "Sign in · wrong password",
        ...PAGE,
        render: () => <LoginPreview error />,
      },
      {
        id: "check-email",
        name: "Sign up · check your email",
        ...PAGE,
        render: () => <CheckEmailPreview />,
      },
      {
        id: "forgot-password",
        name: "Forgot password · form",
        ...PAGE,
        render: () => <ForgotPasswordPreview />,
      },
      {
        id: "update-password",
        name: "Update password · form",
        ...PAGE,
        render: () => <UpdatePasswordPreview />,
      },
      {
        id: "cli-waiting",
        name: "CLI login · waiting for approval",
        ...TERMINAL,
        render: () => <CliLoginTerminal step="waiting" />,
      },
      {
        id: "cli-approve",
        name: "CLI login · approve in browser",
        ...PAGE,
        render: () => <CliApprovePreview step="ask" />,
      },
      {
        id: "cli-signed-out",
        name: "CLI login · approve while signed out",
        ...PAGE,
        render: () => <CliApprovePreview step="signed-out" />,
      },
      {
        id: "cli-approved",
        name: "CLI login · approved page",
        ...PAGE,
        render: () => <CliApprovePreview step="approved" />,
      },
      {
        id: "cli-done",
        name: "CLI login · signed in",
        ...TERMINAL,
        render: () => <CliLoginTerminal step="done" />,
      },
      {
        id: "cli-expired",
        name: "CLI login · code expired",
        ...TERMINAL,
        render: () => <CliLoginTerminal step="expired" />,
      },
    ],
    [
      {
        id: "setup-ai",
        name: "Setup · set up with your AI",
        ...PAGE,
        render: () => <AiSetupPreview />,
      },
      {
        id: "setup-devices",
        name: "Setup · connected devices",
        ...PAGE,
        render: () => <DevicesPreview />,
      },
      {
        id: "setup-no-devices",
        name: "Setup · no device yet",
        ...PAGE,
        render: () => <DevicesPreview empty />,
      },
      {
        id: "setup-first-push",
        name: "Setup · waiting for first session",
        ...PAGE,
        render: () => <FirstPushWaitingPreview />,
      },
    ],
    [
      {
        id: "dashboard-full",
        name: "Dashboard · meter and streak",
        ...PAGE,
        render: () => <DashboardPreview state="full" />,
      },
      {
        id: "dashboard-loading",
        name: "Dashboard · loading",
        ...PAGE,
        render: () => <DashboardPreview state="loading" />,
      },
      {
        id: "dashboard-empty",
        name: "Dashboard · no sessions",
        ...PAGE,
        render: () => <DashboardPreview state="empty" />,
      },
      {
        id: "dashboard-error",
        name: "Dashboard · load failed",
        ...PAGE,
        render: () => <DashboardPreview state="error" />,
      },
      {
        id: "dashboard-offline",
        name: "Dashboard · offline",
        ...PAGE,
        render: () => <DashboardPreview state="offline" />,
      },
    ],
    [
      {
        id: "session-ready",
        name: "Session · cards, why locked",
        ...PAGE,
        render: () => <SessionPreview state="ready" />,
      },
      {
        id: "session-processing",
        name: "Session · processing",
        ...PAGE,
        render: () => <SessionPreview state="processing" />,
      },
      {
        id: "session-failed",
        name: "Session · failed",
        ...PAGE,
        render: () => <SessionPreview state="failed" />,
      },
      {
        id: "session-no-cards",
        name: "Session · no cards",
        ...PAGE,
        render: () => <SessionPreview state="no-cards" />,
      },
    ],
    [
      {
        id: "review-loading",
        name: "Review · queue loading",
        ...PAGE,
        render: () => <ReviewStatePreview state="loading" />,
      },
      {
        id: "review-queue",
        name: "Review · queue",
        ...PAGE,
        render: () => <ReviewQueuePreview />,
      },
      {
        id: "review-answer",
        name: "Review · answer first",
        ...PAGE,
        render: () => <ReviewAnswerPreview />,
      },
      {
        id: "review-grading",
        name: "Review · scoring",
        ...PAGE,
        render: () => <ReviewStatePreview state="grading" />,
      },
      {
        id: "review-result",
        name: "Review · result",
        ...PAGE,
        render: () => <ReviewStatePreview state="result" />,
      },
      {
        id: "review-dont-know",
        name: "Review · I don't know yet",
        ...PAGE,
        render: () => <ReviewStatePreview state="dont-know" />,
      },
      {
        id: "review-caught-up",
        name: "Review · done for today",
        ...PAGE,
        render: () => <ReviewStatePreview state="caught-up" />,
      },
      {
        id: "review-failed",
        name: "Review · scoring failed",
        ...PAGE,
        render: () => <ReviewStatePreview state="failed" />,
      },
      {
        id: "review-no-cards",
        name: "Review · no cards yet",
        ...PAGE,
        render: () => <ReviewStatePreview state="no-cards" />,
      },
    ],
    [
      {
        id: "defend-start",
        name: "Defend it · start",
        ...PAGE,
        render: () => <DefendStartPreview />,
      },
      {
        id: "defend-answer",
        name: "Defend it · timed answer, paste off",
        ...PAGE,
        render: () => <DefendAnswerPreview />,
      },
      {
        id: "defend-follow-up",
        name: "Defend it · AI follow-up",
        ...PAGE,
        render: () => <DefendAnswerPreview followUp />,
      },
      {
        id: "defend-passed",
        name: "Defend it · defended",
        ...PAGE,
        render: () => <DefendResultPreview state="passed" />,
      },
      {
        id: "defend-time-up",
        name: "Defend it · time's up",
        ...PAGE,
        render: () => <DefendResultPreview state="time-up" />,
      },
      {
        id: "defend-none",
        name: "Defend it · nothing owned yet",
        ...PAGE,
        render: () => <DefendResultPreview state="none-owned" />,
      },
    ],
    [
      {
        id: "progress-full",
        name: "Progress · with data",
        ...PAGE,
        render: () => <ProgressPreview state="full" />,
      },
      {
        id: "progress-loading",
        name: "Progress · loading",
        ...PAGE,
        render: () => <ProgressPreview state="loading" />,
      },
      {
        id: "progress-empty",
        name: "Progress · no reviews yet",
        ...PAGE,
        render: () => <ProgressPreview state="empty" />,
      },
      {
        id: "report-off",
        name: "Report · off (opt-in)",
        ...PAGE,
        render: () => <ReportSettingsPreview on={false} />,
      },
      {
        id: "report-on",
        name: "Report · on, link and repos",
        ...PAGE,
        render: () => <ReportSettingsPreview on />,
      },
      {
        id: "report-shared",
        name: "Report · public page",
        ...PAGE,
        render: () => <ReportPublicPreview />,
      },
      {
        id: "report-public-empty",
        name: "Report · public, nothing owned yet",
        ...PAGE,
        render: () => <ReportPublicEmptyPreview />,
      },
      {
        id: "report-public-off",
        name: "Report · public, turned off or wrong link",
        ...PAGE,
        render: () => <ReportPublicOffPreview />,
      },
      {
        id: "settings",
        name: "Settings · profile",
        ...PAGE,
        render: () => <SettingsPreview />,
      },
      {
        id: "settings-delete",
        name: "Settings · delete account confirm",
        ...PAGE,
        render: () => <SettingsPreview deleteOpen />,
      },
      {
        id: "email",
        name: "Email · daily review",
        width: 560,
        height: 520,
        render: () => <EmailPreview />,
      },
    ],
  ]),
];

/** The redesign options start one row gap below the lowest current preview. */
const optionsTop = Math.max(...currentItems.map((item) => item.y + item.height)) + ROW_GAP * 2;

const optionItems = stack(optionsTop, optionRows);

/** The app map (every route in its picked design, every state, and the flows between them) below the options. */
const mapTop = Math.max(...optionItems.map((item) => item.y + item.height)) + ROW_GAP * 2;

export const canvasItems: CanvasItem[] = [
  ...currentItems,
  ...optionItems,
  ...stack(mapTop, mapRows),
];

/**
 * The page's only child: the canvas with every preview above. Client-side, since each entry renders a component.
 * `heroCard` is the marketing hero's product object, rendered on the server (see HeroCard).
 */
export function IdeasCanvas({ heroCard }: { heroCard: React.ReactNode }) {
  return (
    <HeroCard value={heroCard}>
      <Canvas items={canvasItems} title="Session Coach ideas canvas" />
    </HeroCard>
  );
}
