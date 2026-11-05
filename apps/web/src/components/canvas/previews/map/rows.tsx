"use client";

// The app map on /canvas: the flows that connect the app first, then one row per route, each route in its picked design
// with every state the app has for it (found in app/**/page.tsx, error.tsx, not-found.tsx and the components they
// render). Names read `Map · <route> · <state>`; the flow cards link to the items by id.

import { AllCaughtUpEmpty, DoneForTodayEmpty, NoCardsYetEmpty } from "@/components/app/empty-state";
import { ProjectSetupCard } from "@/components/projects/project-setup-card";
import { PASTE_OFF } from "@/components/review/quiz-form";
import { DAILY_CAP, DAILY_CAP_MESSAGE } from "@/lib/review/today";

import type { CanvasItem } from "../../canvas";
import { DeleteAccountOpen, EmailPreview, FlowPreview } from "../more";
import {
  AuthCheckEmailOptionB,
  AuthConfirm,
  AuthErrorOptionB,
  AuthForgotPasswordOptionB,
  AuthLoginOptionB,
  AuthSignUpOptionB,
  AuthUpdatePasswordOptionB,
} from "../options/auth";
import { DashboardHomeOptionB, DashboardHomeOptionBEmpty } from "../options/dashboard";
import { DefendOptionC } from "../options/defend";
import { MarketingHowItWorksOptionB, MarketingPricingOptionC } from "../options/marketing";
import { OnboardingCliApproveOptionC } from "../options/onboarding";
import { ProgressSettingsProgressOptionC } from "../options/progress";
import { ProgressSettingsSettingsOptionA } from "../options/progress-settings";
import {
  CanvasQuiz,
  CanvasQuizAnswer,
  CanvasQuizResult,
  CanvasReviewQueue,
} from "../options/review";
import { CanvasSession } from "../options/session";
import {
  MapAppErrorPage,
  MapDashboardLoading,
  MapNotFoundPage,
  MapReviewCardLoading,
  MapServerErrorPage,
  MapSessionLoading,
} from "./app";
import { MapCliApprove, MapCliTerminal } from "./cli";
import {
  MapCardNotFound,
  MapDashboardError,
  MapProgressEmpty,
  MapReviewError,
  MapSessionNotFound,
} from "./learning";
import { CanvasToast } from "./parts";
import { MapSetup } from "./setup";

type Entry = Omit<CanvasItem, "x" | "y">;

const PAGE = { width: 1440, height: 900 };
const TERMINAL = { width: 720, height: 460 };

/** A full-page state. `route` and `state` make the id and the name, so the two never drift apart. */
const page = (route: string, state: string, render: () => React.ReactNode): Entry => ({
  id: mapId(route, state),
  name: `Map · ${route} · ${state}`,
  ...PAGE,
  render,
});

/** `/cli/approve`, `expired` → `map-cli-approve-expired`. */
function mapId(route: string, state: string) {
  return `map-${`${route} ${state}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

// ---------------------------------------------------------------------------------------------------------------------
// Route rows, in the order a learner meets them.

const routeRows: Entry[][] = [
  // App-wide: what any route can turn into.
  [
    page("app", "page not found", () => <MapNotFoundPage />),
    page("app", "server error", () => <MapServerErrorPage />),
    page("app", "error inside the app", () => <MapAppErrorPage />),
    page("app", "loading dashboard", () => <MapDashboardLoading />),
    page("app", "loading session", () => <MapSessionLoading />),
    page("app", "loading card", () => <MapReviewCardLoading />),
  ],
  [
    page("/how-it-works", "default", () => <MarketingHowItWorksOptionB />),
    page("/pricing", "default", () => <MarketingPricingOptionC />),
  ],
  [
    page("/sign-up", "default", () => <AuthSignUpOptionB />),
    page("/sign-up", "field error", () => (
      <AuthSignUpOptionB
        state={{
          fields: {
            email: "Enter an email address like name@example.com.",
            password: "Use at least 8 characters.",
          },
        }}
      />
    )),
    page("/sign-up", "rate limited", () => (
      <AuthSignUpOptionB
        state={{
          status: "error",
          message: "Too many attempts from your network. Try again in 10 minutes.",
        }}
      />
    )),
  ],
  [
    page("/sign-up/check-email", "default", () => <AuthCheckEmailOptionB />),
    page("/sign-up/check-email", "resent", () => <AuthCheckEmailOptionB resent />),
  ],
  [
    page("/auth/confirm", "sign up", () => <AuthConfirm state="sign-up" />),
    page("/auth/confirm", "password reset", () => <AuthConfirm state="recovery" />),
    page("/auth/confirm", "incomplete link", () => <AuthConfirm state="incomplete" />),
  ],
  [
    page("/login", "default", () => <AuthLoginOptionB />),
    page("/login", "field error", () => (
      <AuthLoginOptionB state={{ fields: { password: "Enter your password." } }} />
    )),
    page("/login", "wrong password", () => (
      <AuthLoginOptionB
        state={{ status: "error", message: "That email and password don't match." }}
      />
    )),
    page("/login", "email not confirmed", () => (
      <AuthLoginOptionB
        state={{
          status: "unconfirmed",
          message: "Confirm your email address first. We can send the link again.",
          email: "sam@example.com",
        }}
      />
    )),
    page("/login", "rate limited", () => (
      <AuthLoginOptionB
        state={{ status: "error", message: "Too many attempts. Wait a minute, then try again." }}
      />
    )),
  ],
  [
    page("/forgot-password", "default", () => <AuthForgotPasswordOptionB />),
    page("/forgot-password", "field error", () => (
      <AuthForgotPasswordOptionB state={{ fields: { email: "Enter your email address." } }} />
    )),
    page("/forgot-password", "link sent", () => (
      <AuthForgotPasswordOptionB state={{ status: "sent", email: "sam@example.com" }} />
    )),
  ],
  [
    page("/update-password", "default", () => <AuthUpdatePasswordOptionB />),
    page("/update-password", "field error", () => (
      <AuthUpdatePasswordOptionB state={{ fields: { password: "Use at least 8 characters." } }} />
    )),
    page("/update-password", "link expired", () => (
      <AuthUpdatePasswordOptionB
        state={{
          status: "error",
          message: "Your reset link has expired. Request a new one to set a password.",
        }}
      />
    )),
  ],
  [
    page("/auth/error", "link expired", () => <AuthErrorOptionB />),
    page("/auth/error", "confirmed in another browser", () => (
      <AuthErrorOptionB code="confirmed_sign_in" />
    )),
    page("/auth/error", "google cancelled", () => <AuthErrorOptionB code="access_denied" />),
  ],
  [
    page("/setup", "no device", () => <MapSetup state="no-device" />),
    page("/setup", "device connected", () => <MapSetup state="device" />),
    page("/setup", "first push done", () => <MapSetup state="first-push" />),
    page("/setup", "devices failed to load", () => <MapSetup state="devices-failed" />),
  ],
  [
    {
      id: "map-cli-login-waiting",
      name: "Map · CLI · login waiting",
      ...TERMINAL,
      render: () => <MapCliTerminal step="waiting" />,
    },
    {
      id: "map-cli-login-signed-in",
      name: "Map · CLI · signed in",
      ...TERMINAL,
      render: () => <MapCliTerminal step="signed-in" />,
    },
    {
      id: "map-cli-login-expired",
      name: "Map · CLI · code expired",
      ...TERMINAL,
      render: () => <MapCliTerminal step="expired" />,
    },
    {
      id: "map-cli-login-denied",
      name: "Map · CLI · login denied",
      ...TERMINAL,
      render: () => <MapCliTerminal step="denied" />,
    },
    {
      id: "map-cli-push",
      name: "Map · CLI · push uploaded",
      ...TERMINAL,
      render: () => <MapCliTerminal step="push" />,
    },
  ],
  [
    page("/cli/approve", "pending", () => <OnboardingCliApproveOptionC />),
    page("/cli/approve", "approved", () => <MapCliApprove state="approved" />),
    page("/cli/approve", "denied", () => <MapCliApprove state="denied" />),
    page("/cli/approve", "expired", () => <MapCliApprove state="expired" />),
    page("/cli/approve", "already approved", () => <MapCliApprove state="already-approved" />),
    page("/cli/approve", "used", () => <MapCliApprove state="used" />),
    page("/cli/approve", "missing code", () => <MapCliApprove state="missing" />),
    page("/cli/approve", "unknown code", () => <MapCliApprove state="unknown" />),
    page("/cli/approve", "rate limited", () => <MapCliApprove state="rate-limited" />),
    page("/cli/approve", "lookup failed", () => <MapCliApprove state="lookup-failed" />),
  ],
  [
    {
      id: "map-email-daily-review",
      name: "Map · email · daily review",
      width: 560,
      height: 520,
      render: () => <EmailPreview />,
    },
    page("/dashboard", "full", () => <DashboardHomeOptionB />),
    page("/dashboard", "first visit", () => <DashboardHomeOptionBEmpty />),
    page("/dashboard", "new project question", () => (
      <DashboardHomeOptionB before={<ProjectSetupCard repo="rapporteur" />} />
    )),
    page("/dashboard", "filtered by project", () => (
      <DashboardHomeOptionB initialRepo="rapporteur" />
    )),
    page("/dashboard", "done for today", () => <DashboardHomeOptionB empty="done" />),
    page("/dashboard", "caught up", () => <DashboardHomeOptionB empty="caught-up" />),
    page("/dashboard", "error", () => <MapDashboardError />),
    page("/dashboard", "offline", () => <MapDashboardError offline />),
  ],
  [
    page("/s/[id]", "queued", () => <CanvasSession status="pending" />),
    page("/s/[id]", "processing", () => <CanvasSession status="processing" />),
    page("/s/[id]", "ready", () => <CanvasSession status="ready" />),
    page("/s/[id]", "failed", () => <CanvasSession status="failed" />),
    page("/s/[id]", "stopped", () => <CanvasSession status="processing" stuck />),
    page("/s/[id]", "no cards", () => <CanvasSession status="ready" noCards />),
    page("/s/[id]", "not found", () => <MapSessionNotFound />),
  ],
  [
    page("/review", "queue", () => <CanvasReviewQueue />),
    page("/review", "done for today", () => (
      <CanvasReviewQueue>
        <DoneForTodayEmpty cap={DAILY_CAP} />
      </CanvasReviewQueue>
    )),
    page("/review", "caught up", () => (
      <CanvasReviewQueue>
        <AllCaughtUpEmpty next="tomorrow" />
      </CanvasReviewQueue>
    )),
    page("/review", "no cards yet", () => (
      <CanvasReviewQueue>
        <NoCardsYetEmpty />
      </CanvasReviewQueue>
    )),
    page("/review", "cards on the way", () => (
      <CanvasReviewQueue>
        <NoCardsYetEmpty cardless={{ reason: "processing" }} />
      </CanvasReviewQueue>
    )),
    page("/review", "error", () => <MapReviewError />),
  ],
  [
    page("/review/[cardId]", "answering", () => <CanvasQuiz />),
    page("/review/[cardId]", "paste blocked", () => <CanvasQuizAnswer error={PASTE_OFF} />),
    page("/review/[cardId]", "scoring", () => (
      <CanvasQuizAnswer
        pending="answer"
        answer="So the client knows when it can try again."
        toast={{ title: "Scoring your answer" }}
      />
    )),
    page("/review/[cardId]", "result 2 explained", () => <CanvasQuizResult score={2} />),
    page("/review/[cardId]", "result 1 partly", () => <CanvasQuizResult score={1} />),
    page("/review/[cardId]", "result 0 missed", () => <CanvasQuizResult score={0} />),
    page("/review/[cardId]", "i don't know yet", () => <CanvasQuizResult skipped />),
    page("/review/[cardId]", "last card today", () => <CanvasQuizResult last />),
    page("/review/[cardId]", "cap of 5 reached", () => (
      <CanvasQuizAnswer answer="The CLI waits for Retry-After." error={DAILY_CAP_MESSAGE} />
    )),
    page("/review/[cardId]", "rate limited", () => (
      <CanvasQuizAnswer
        answer="The CLI waits for Retry-After."
        error="Too many answers in the last hour. Try again in 12 minutes."
        toast={{
          title: "Your answer couldn't be scored",
          description:
            "It's still in the box. Too many answers in the last hour. Try again in 12 minutes.",
        }}
      />
    )),
    page("/review/[cardId]", "scoring failed", () => (
      <CanvasQuizAnswer
        answer="The CLI waits for Retry-After."
        error="Your answer couldn't be scored. Try again."
        toast={{
          title: "Your answer couldn't be scored",
          description: "It's still in the box. Your answer couldn't be scored. Try again.",
        }}
      />
    )),
    page("/review/[cardId]", "card not found", () => <MapCardNotFound />),
  ],
  [
    page("/defend", "nothing to defend", () => <DefendOptionC stage="empty" />),
    page("/defend", "start", () => <DefendOptionC />),
    page("/defend", "couldn't start", () => (
      <DefendOptionC error="A defense from earlier is still running, maybe from before a reload. It ends within about 3 minutes; start again then." />
    )),
    page("/defend", "answering", () => <DefendOptionC stage="answer" />),
    page("/defend", "follow-up", () => <DefendOptionC stage="follow-up" />),
    page("/defend", "defended", () => <DefendOptionC stage="result" />),
    page("/defend", "not defended", () => <DefendOptionC stage="not-defended" />),
    page("/defend", "time's up", () => <DefendOptionC stage="time-up" />),
  ],
  [
    page("/progress", "with data", () => <ProgressSettingsProgressOptionC />),
    page("/progress", "one project", () => (
      <ProgressSettingsProgressOptionC repo="session-coach" />
    )),
    page("/progress", "no reviews yet", () => <MapProgressEmpty state="no-reviews" />),
    page("/progress", "no cards yet", () => <MapProgressEmpty state="no-cards" />),
    page("/progress", "error", () => <MapProgressEmpty state="error" />),
  ],
  [
    page("/settings", "default", () => <ProgressSettingsSettingsOptionA />),
    page("/settings", "saved", () => (
      <ProgressSettingsSettingsOptionA overlay={<CanvasToast title="Profile saved" />} />
    )),
    page("/settings", "delete account confirm", () => (
      <ProgressSettingsSettingsOptionA overlay={<DeleteAccountOpen />} />
    )),
  ],
];

// ---------------------------------------------------------------------------------------------------------------------
// Flows. Each step is an item above; the check at the bottom keeps them honest.

type Flow = { id: string; name: string; title: string; note: string; steps: [string, string][] };

const FLOWS: Flow[] = [
  {
    id: "map-flow-first-run",
    name: "Map · flow · first run",
    title: "Sign up to first cards",
    note: "No token to copy: the CLI gets its own after one click in the browser.",
    steps: [
      ["Sign up", "map-sign-up-default"],
      ["Check your email", "map-sign-up-check-email-default"],
      ["Confirm the email", "map-auth-confirm-sign-up"],
      ["Setup, no device yet", "map-setup-no-device"],
      ["CLI login prints a code", "map-cli-login-waiting"],
      ["Approve the code", "map-cli-approve-pending"],
      ["CLI connected", "map-cli-approve-approved"],
      ["CLI signed in", "map-cli-login-signed-in"],
      ["Setup shows the device", "map-setup-device-connected"],
      ["First push", "map-cli-push"],
      ["Setup: a session arrived", "map-setup-first-push-done"],
      ["Session processing", "map-s-id-processing"],
      ["Cards ready", "map-s-id-ready"],
    ],
  },
  {
    id: "map-flow-daily-loop",
    name: "Map · flow · daily loop",
    title: "Two minutes a day",
    note: "At most 5 cards a day. Reviews on day 1, 4 and 11; a missed day resets nothing.",
    steps: [
      ["Email: cards are due", "map-email-daily-review"],
      ["Dashboard", "map-dashboard-full"],
      ["Review queue", "map-review-queue"],
      ["Answer first", "map-review-cardid-answering"],
      ["Scoring", "map-review-cardid-scoring"],
      ["Result: explained (2)", "map-review-cardid-result-2-explained"],
      ["Or: partly (1)", "map-review-cardid-result-1-partly"],
      ["Or: I don't know yet", "map-review-cardid-i-don-t-know-yet"],
      ["Last card today", "map-review-cardid-last-card-today"],
      ["Done for today", "map-dashboard-done-for-today"],
    ],
  },
  {
    id: "map-flow-defend",
    name: "Map · flow · defend it",
    title: "Defend it, optional",
    note: "Picks a card you explained. Timed, paste off, one follow-up. Never moves a review.",
    steps: [
      ["Start", "map-defend-start"],
      ["Answer against the clock", "map-defend-answering"],
      ["The AI's follow-up", "map-defend-follow-up"],
      ["Defended (2)", "map-defend-defended"],
      ["Or: not defended", "map-defend-not-defended"],
      ["Or: time's up", "map-defend-time-s-up"],
      ["Before any 2: nothing to defend", "map-defend-nothing-to-defend"],
    ],
  },
  {
    id: "map-flow-failed-session",
    name: "Map · flow · failed session",
    title: "A session failed",
    note: "Pushing again starts over from the beginning; the page follows it.",
    steps: [
      ["Session failed", "map-s-id-failed"],
      ["Push it again", "map-cli-push"],
      ["Queued", "map-s-id-queued"],
      ["Processing", "map-s-id-processing"],
      ["Cards ready", "map-s-id-ready"],
      ["Or: no decisions found", "map-s-id-no-cards"],
    ],
  },
  {
    id: "map-flow-expired-code",
    name: "Map · flow · expired CLI code",
    title: "The CLI code expired",
    note: "A code works once and expires after 10 minutes. Nothing is saved until approved.",
    steps: [
      ["Approve page: expired", "map-cli-approve-expired"],
      ["CLI: code expired", "map-cli-login-expired"],
      ["Login again", "map-cli-login-waiting"],
      ["Approve the new code", "map-cli-approve-pending"],
      ["CLI connected", "map-cli-approve-approved"],
      ["CLI signed in", "map-cli-login-signed-in"],
    ],
  },
  {
    id: "map-flow-password-reset",
    name: "Map · flow · password reset",
    title: "Forgot the password",
    note: "A reset changes the password only. Cards, schedules and ownership stay.",
    steps: [
      ["Wrong password", "map-login-wrong-password"],
      ["Forgot password", "map-forgot-password-default"],
      ["Link sent", "map-forgot-password-link-sent"],
      ["Open the link", "map-auth-confirm-password-reset"],
      ["Set a new password", "map-update-password-default"],
      ["Back on the dashboard", "map-dashboard-full"],
      ["Link used twice", "map-auth-error-link-expired"],
    ],
  },
  {
    id: "map-flow-project-setup",
    name: "Map · flow · project setup",
    title: "A new project",
    note: "The level applies to sessions processed after the change. Existing cards keep theirs.",
    steps: [
      ["Dashboard asks the level", "map-dashboard-new-project-question"],
      ["Filter to the project", "map-dashboard-filtered-by-project"],
      ["Change it in Settings", "map-settings-default"],
      ["Saved", "map-settings-saved"],
    ],
  },
];

const flowRow: Entry[] = FLOWS.map((flow) => ({
  id: flow.id,
  name: flow.name,
  width: 440,
  height: 220 + flow.steps.length * 40,
  render: () => (
    <FlowPreview
      title={flow.title}
      note={flow.note}
      steps={flow.steps.map(([label, item]) => ({ label, item }))}
    />
  ),
}));

const routeIds = new Set(routeRows.flat().map((entry) => entry.id));
if (routeIds.size !== routeRows.flat().length) throw new Error("Two map items share an id");
for (const flow of FLOWS)
  for (const [, item] of flow.steps)
    if (!routeIds.has(item)) throw new Error(`${flow.name} links to a missing item: ${item}`);

export const mapRows: Entry[][] = [flowRow, ...routeRows];
