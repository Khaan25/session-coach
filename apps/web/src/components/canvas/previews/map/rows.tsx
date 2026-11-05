"use client";

// The app map on /canvas: the flows that connect the app first, then one row per route, each route in its picked design
// with every state the app has for it (found in app/**/page.tsx, error.tsx, not-found.tsx and the components they
// render). Names read `Map · <route> · <state>`; the flow cards link to the items by id.

import { AuthNotice } from "@/components/auth/auth-notice";

import type { CanvasItem } from "../../canvas";
import { DeleteAccountOpen, EmailPreview, FlowPreview } from "../more";
import {
  AuthCheckEmailOptionB,
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
import {
  ProgressSettingsProgressOptionC,
  ProgressSettingsSettingsOptionA,
} from "../options/progress-settings";
import { ReviewCardOptionB, ReviewQueueOptionB } from "../options/review";
import {
  SessionFailedOptionB,
  SessionNoCardsOptionB,
  SessionProcessingOptionB,
  SessionReadyOptionB,
} from "../options/session";
import {
  MapAppErrorPage,
  MapDashboardLoading,
  MapNotFoundPage,
  MapReviewCardLoading,
  MapServerErrorPage,
  MapSessionLoading,
} from "./app";
import { MapAuthConfirm } from "./auth";
import { MapCliApprove, MapCliTerminal } from "./cli";
import {
  MapCardNotFound,
  MapDashboardError,
  MapDefendEnding,
  MapProgressEmpty,
  MapProjectSetupCard,
  MapReviewEmpty,
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
        errors={{
          email: "Enter an email address like name@example.com.",
          password: "Use at least 8 characters.",
        }}
      />
    )),
    page("/sign-up", "rate limited", () => (
      <AuthSignUpOptionB
        notice={
          <AuthNotice title="Couldn't create the account" fail>
            Too many attempts from your network. Try again in 10 minutes.
          </AuthNotice>
        }
      />
    )),
  ],
  [
    page("/sign-up/check-email", "default", () => <AuthCheckEmailOptionB />),
    page("/sign-up/check-email", "resent", () => <AuthCheckEmailOptionB resent />),
  ],
  [
    page("/auth/confirm", "sign up", () => <MapAuthConfirm state="sign-up" />),
    page("/auth/confirm", "password reset", () => <MapAuthConfirm state="recovery" />),
    page("/auth/confirm", "incomplete link", () => <MapAuthConfirm state="incomplete" />),
  ],
  [
    page("/login", "default", () => <AuthLoginOptionB />),
    page("/login", "field error", () => (
      <AuthLoginOptionB errors={{ password: "Enter your password." }} />
    )),
    page("/login", "wrong password", () => (
      <AuthLoginOptionB
        notice={
          <AuthNotice title="Couldn't sign in" fail>
            That email and password don&apos;t match.
          </AuthNotice>
        }
      />
    )),
    page("/login", "email not confirmed", () => (
      <AuthLoginOptionB
        notice={
          <AuthNotice title="Confirm your email">
            Confirm your email address first. We can send the link again.
          </AuthNotice>
        }
      />
    )),
    page("/login", "rate limited", () => (
      <AuthLoginOptionB
        notice={
          <AuthNotice title="Couldn't sign in" fail>
            Too many attempts. Wait a minute, then try again.
          </AuthNotice>
        }
      />
    )),
  ],
  [
    page("/forgot-password", "default", () => <AuthForgotPasswordOptionB />),
    page("/forgot-password", "field error", () => (
      <AuthForgotPasswordOptionB errors={{ email: "Enter your email address." }} />
    )),
    page("/forgot-password", "link sent", () => (
      <AuthForgotPasswordOptionB
        notice={
          <AuthNotice title="Check your email">
            If an account exists for that address, we sent a link to reset the password. Open it on
            this device.
          </AuthNotice>
        }
      />
    )),
  ],
  [
    page("/update-password", "default", () => <AuthUpdatePasswordOptionB />),
    page("/update-password", "field error", () => (
      <AuthUpdatePasswordOptionB errors={{ password: "Use at least 8 characters." }} />
    )),
    page("/update-password", "link expired", () => (
      <AuthUpdatePasswordOptionB
        notice={
          <AuthNotice title="Couldn't save the password" fail>
            Your reset link has expired. Request a new one to set a password.
          </AuthNotice>
        }
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
      <DashboardHomeOptionB before={<MapProjectSetupCard repo="rapporteur" />} />
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
    page("/s/[id]", "queued", () => <SessionProcessingOptionB queued />),
    page("/s/[id]", "processing", () => <SessionProcessingOptionB />),
    page("/s/[id]", "ready", () => <SessionReadyOptionB />),
    page("/s/[id]", "failed", () => <SessionFailedOptionB />),
    page("/s/[id]", "no cards", () => <SessionNoCardsOptionB />),
    page("/s/[id]", "not found", () => <MapSessionNotFound />),
  ],
  [
    page("/review", "queue", () => <ReviewQueueOptionB />),
    page("/review", "done for today", () => <MapReviewEmpty state="done" />),
    page("/review", "caught up", () => <MapReviewEmpty state="caught-up" />),
    page("/review", "no cards yet", () => <MapReviewEmpty state="no-cards" />),
    page("/review", "cards on the way", () => <MapReviewEmpty state="on-the-way" />),
    page("/review", "error", () => <MapReviewEmpty state="error" />),
  ],
  [
    page("/review/[cardId]", "answering", () => <ReviewCardOptionB controls={false} />),
    page("/review/[cardId]", "paste blocked", () => (
      <ReviewCardOptionB controls={false} error="Paste is off here. Type it in your own words." />
    )),
    page("/review/[cardId]", "scoring", () => (
      <ReviewCardOptionB
        controls={false}
        pending="answer"
        answer="So the client knows when it can try again."
        overlay={<CanvasToast title="Scoring your answer" />}
      />
    )),
    page("/review/[cardId]", "result 2 explained", () => (
      <ReviewCardOptionB controls={false} stage="result" score={2} />
    )),
    page("/review/[cardId]", "result 1 partly", () => (
      <ReviewCardOptionB controls={false} stage="result" score={1} />
    )),
    page("/review/[cardId]", "result 0 missed", () => (
      <ReviewCardOptionB controls={false} stage="result" score={0} />
    )),
    page("/review/[cardId]", "i don't know yet", () => (
      <ReviewCardOptionB controls={false} stage="skipped" />
    )),
    page("/review/[cardId]", "last card today", () => (
      <ReviewCardOptionB controls={false} stage="caught-up" />
    )),
    page("/review/[cardId]", "cap of 5 reached", () => (
      <ReviewCardOptionB
        controls={false}
        answer="The CLI waits for Retry-After."
        error="You've done 5 cards today. This one comes back tomorrow."
      />
    )),
    page("/review/[cardId]", "rate limited", () => (
      <ReviewCardOptionB
        controls={false}
        answer="The CLI waits for Retry-After."
        error="Too many answers in the last hour. Try again in 12 minutes."
        overlay={
          <CanvasToast
            title="Your answer couldn't be scored"
            description="It's still in the box. Too many answers in the last hour. Try again in 12 minutes."
          />
        }
      />
    )),
    page("/review/[cardId]", "scoring failed", () => (
      <ReviewCardOptionB
        controls={false}
        answer="The CLI waits for Retry-After."
        error="Your answer couldn't be scored. Try again."
        overlay={
          <CanvasToast
            title="Your answer couldn't be scored"
            description="It's still in the box. Your answer couldn't be scored. Try again."
          />
        }
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
    page("/defend", "not defended", () => <MapDefendEnding kind="not-defended" />),
    page("/defend", "time's up", () => <MapDefendEnding kind="time-up" />),
  ],
  [
    page("/progress", "with data", () => <ProgressSettingsProgressOptionC />),
    page("/progress", "no reviews yet", () => <MapProgressEmpty state="no-reviews" />),
    page("/progress", "no cards yet", () => <MapProgressEmpty state="no-cards" />),
    page("/progress", "error", () => <MapProgressEmpty state="error" />),
  ],
  [
    page("/settings", "default", () => <ProgressSettingsSettingsOptionA id="map-settings" />),
    page("/settings", "saved", () => (
      <ProgressSettingsSettingsOptionA
        id="map-settings-saved"
        overlay={<CanvasToast title="Profile saved" />}
      />
    )),
    page("/settings", "delete account confirm", () => (
      <ProgressSettingsSettingsOptionA id="map-settings-delete" overlay={<DeleteAccountOpen />} />
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
