"use client";

// The inventory under the flow: every route, in every state its page can render, one row per area. As in
// flow-screens.tsx, each frame is the route's real components (or its real loading, error and not-found files) fed
// synthetic rows, inside the route's layout frame. Nothing here calls an API: the frames sit under DryRunContext, the
// quiz grades through QuizSendContext, and a timed defense is drawn at a fixed second instead of started.
//
// Not on the canvas, and why:
// - /tracker: a team page, not a learner route; its checkboxes call Server Actions with no dry-run guard.
// - /auth/confirm with a token: its form posts straight to the confirmEmail Server Action, so a click would send a
//   real request. The no-token state (an incomplete link) is drawn.
// - /setup with the devices read failed: the page builds that card inline, so a frame would hand-copy it.
// - /dashboard signed out: proxy.ts sends the visitor to /login before the page renders.
// - global-error.tsx: it replaces the root layout with its own <html>, so it can't sit in a frame; it draws the same
//   ErrorPage as the root error.tsx, which is here.
// - Toasts (answer scored, token created): they portal to the page's toaster, not into a frame.

import Link from "next/link";
import { useEffect, useRef } from "react";

import AppError from "@/app/(app)/error";
import AppNotFound from "@/app/(app)/not-found";
import DashboardError from "@/app/(app)/dashboard/error";
import TodayLoading from "@/app/(app)/dashboard/loading";
import { TodayColumn } from "@/app/(app)/dashboard/dashboard-sample-view";
import DefendError from "@/app/(app)/defend/error";
import DefendLoading from "@/app/(app)/defend/loading";
import ProgressError from "@/app/(app)/progress/error";
import ProgressLoading from "@/app/(app)/progress/loading";
import CardError from "@/app/(app)/review/[cardId]/error";
import CardLoading from "@/app/(app)/review/[cardId]/loading";
import CardNotFound from "@/app/(app)/review/[cardId]/not-found";
import ReviewError from "@/app/(app)/review/error";
import ReviewLoading from "@/app/(app)/review/loading";
import SessionError from "@/app/(app)/s/[id]/error";
import SessionLoading from "@/app/(app)/s/[id]/loading";
import SessionNotFound from "@/app/(app)/s/[id]/not-found";
import SetupError from "@/app/(app)/setup/error";
import SetupLoading from "@/app/(app)/setup/loading";
import RootError from "@/app/error";
import type { AuthState } from "@/app/(auth)/actions";
import { Container } from "@/components/app/container";
import {
  AllCaughtUpEmpty,
  DoneForTodayEmpty,
  NoCardsYetEmpty,
  NoReviewsEmpty,
} from "@/components/app/empty-state";
import { AppPageHeader } from "@/components/app/page-header";
import { AuthSwitch } from "@/components/auth/auth-parts";
import {
  CheckEmailHeading,
  ForgotPasswordHeading,
  LoginHeading,
  SignUpHeading,
  UpdatePasswordHeading,
} from "@/components/auth/auth-screens";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { LoginForm } from "@/components/auth/login-form";
import { ResendConfirmation } from "@/components/auth/resend-confirmation";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { AuthPreviewContext } from "@/components/auth/use-auth-form";
import type { CardView } from "@/lib/cards/columns";
import { ApproveRequest } from "@/components/cli/approve-request";
import {
  ApproveCodeForm,
  ApproveDone,
  ApproveNotice,
  SETTLED_COPY,
} from "@/components/cli/approve-states";
import { SAMPLE_QUEUE } from "@/components/dashboard/dashboard-sample";
import { NextCard, TodayMessage, TodayView } from "@/components/dashboard/today-view";
import {
  DefendColumn,
  DefendResult,
  DefendStart,
  DefendTimed,
  NothingToDefend,
  type DefendCard,
  type TimeUpReason,
} from "@/components/defend/defend-flow";
import { NotFoundBody } from "@/components/errors/not-found-body";
import { MembersView } from "@/components/members/members-view";
import { SetupGuide } from "@/components/onboarding/setup-guide";
import { ProjectSetupCard } from "@/components/projects/project-setup-card";
import { SAMPLE_PROGRESS } from "@/components/progress/progress-sample";
import { ProgressEmpty, ProgressSummary } from "@/components/progress/progress-view";
import { ReportView, type LoadedReport } from "@/components/report/report-view";
import {
  PASTE_OFF,
  QuizAnswer,
  QuizResult,
  QuizSendContext,
  type Grade,
} from "@/components/review/quiz-form";
import {
  SAMPLE_GRADES,
  SAMPLE_QUIZ_CARD,
  SAMPLE_REVIEW_QUEUE,
} from "@/components/review/review-sample";
import { QueueList, QuizHeader, QuizView, ReviewHeader } from "@/components/review/review-views";
import {
  SAMPLE_SESSION,
  SAMPLE_SESSION_CARDS,
  SAMPLE_SESSION_NOW,
} from "@/components/sessions/session-sample";
import { SessionView } from "@/components/sessions/session-view";
import {
  SAMPLE_DEVICES,
  SAMPLE_PROFILE,
  SAMPLE_PROJECTS,
  SAMPLE_REPORT,
  SAMPLE_TIMEZONES,
} from "@/components/settings/settings-sample";
import { SettingsHeader, SettingsView } from "@/components/settings/settings-view";
import { DeviceSection } from "@/components/setup/device-section";
import { SetupSteps } from "@/components/setup/setup-steps";
import { SetupView } from "@/components/setup/setup-view";
import { buttonVariants } from "@/components/ui/button";
import type { SessionSummary } from "@/lib/sessions/rows";
import { PortalProvider } from "@/lib/ui/portal";

import { AppFrame, AuthFrame, FrameWindow, PublicFrame } from "./frames";
import { useServerScreen, type ServerScreens } from "./server-screens";

/** One frame: the route, its state, what it draws, and a size when it isn't a full page. */
export type InventoryFrame = {
  route: string;
  state: string;
  render: () => React.ReactNode;
  size?: { width: number; height: number };
};

const frame = (
  route: string,
  state: string,
  render: () => React.ReactNode,
  size?: InventoryFrame["size"],
): InventoryFrame => ({ route, state, render, size });

// ---------------------------------------------------------------------------------------------------------------------
// Shared pieces.

/** A server error as Next hands it to a boundary: a digest, the reference code, and no message to show. */
const SAMPLE_ERROR = Object.assign(new Error("Synthetic canvas error"), { digest: "3790123546" });
const noop = () => {};

/**
 * Opens the dialog whose trigger reads `trigger`, once, as a click on it would. The stage PortalProvider keeps the
 * dialog in this frame (the canvas item's transform is its `fixed` overlay's box); a click elsewhere closes it.
 */
function OpenDialog({ trigger, children }: { trigger: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const triggers = ref.current?.querySelectorAll<HTMLElement>("button");
    Array.from(triggers ?? [])
      .find((el) => el.textContent?.includes(trigger))
      ?.click();
  }, [trigger]);
  return (
    <div ref={ref} className="contents">
      <PortalProvider>{children}</PortalProvider>
    </div>
  );
}

/** Grades an answer without the API: a short wait, then the sample grade for a 2. */
const canvasSend = () =>
  new Promise<Grade>((resolve) => setTimeout(() => resolve(SAMPLE_GRADES[2]), 800));

/** Every quiz box on a frame grades through canvasSend, so a submit never reaches /api/review/answer. */
function Quiz({ children }: { children: React.ReactNode }) {
  return <QuizSendContext value={canvasSend}>{children}</QuizSendContext>;
}

// ---------------------------------------------------------------------------------------------------------------------
// Marketing: route modules, rendered on the server (see ServerScreens).

function Public({ path, name }: { path: string; name: keyof ServerScreens }) {
  return <PublicFrame path={path}>{useServerScreen(name)}</PublicFrame>;
}

const marketing: InventoryFrame[] = [
  frame("/", "signed out", () => <Public path="/" name="home" />),
  frame("/how-it-works", "default", () => <Public path="/how-it-works" name="howItWorks" />),
  frame("/pricing", "default", () => <Public path="/pricing" name="pricing" />),
  frame("/support", "default", () => <Public path="/support" name="support" />),
  frame("/privacy", "default", () => <Public path="/privacy" name="privacy" />),
  frame("/terms", "default", () => <Public path="/terms" name="terms" />),
  frame("/delete-account", "default", () => <Public path="/delete-account" name="deleteAccount" />),
];

// ---------------------------------------------------------------------------------------------------------------------
// Auth: the real forms. AuthPreviewContext draws a server answer in the form without a submit.

const EMAIL = "sam@example.com";

function Preview({ state, children }: { state: AuthState; children: React.ReactNode }) {
  return <AuthPreviewContext value={state}>{children}</AuthPreviewContext>;
}

/** The auth pages rendered on the server: their notice is read from the query inside the route module. */
function AuthServer({ path, name }: { path: string; name: keyof ServerScreens }) {
  return <AuthFrame path={path}>{useServerScreen(name)}</AuthFrame>;
}

const auth: InventoryFrame[] = [
  frame("/login", "default", () => (
    <AuthFrame path="/login">
      <LoginHeading />
      <LoginForm />
    </AuthFrame>
  )),
  frame("/login", "wrong password", () => (
    <AuthFrame path="/login">
      <LoginHeading />
      <Preview
        state={{ status: "error", message: "That email and password don't match.", email: EMAIL }}
      >
        <LoginForm />
      </Preview>
    </AuthFrame>
  )),
  frame("/login", "email not confirmed", () => (
    <AuthFrame path="/login">
      <LoginHeading />
      <Preview
        state={{
          status: "unconfirmed",
          message: "Confirm your email address first. We can send the link again.",
          email: EMAIL,
        }}
      >
        <LoginForm />
      </Preview>
    </AuthFrame>
  )),
  frame("/sign-up", "default", () => (
    <AuthFrame path="/sign-up">
      <SignUpHeading />
      <SignUpForm />
    </AuthFrame>
  )),
  frame("/sign-up/check-email", "default", () => (
    <AuthFrame path="/sign-up/check-email">
      <CheckEmailHeading />
      <ResendConfirmation email={EMAIL} />
      <AuthSwitch prompt="Already confirmed?" href="/login">
        Sign in
      </AuthSwitch>
    </AuthFrame>
  )),
  frame("/forgot-password", "default", () => (
    <AuthFrame path="/forgot-password">
      <ForgotPasswordHeading />
      <ForgotPasswordForm />
    </AuthFrame>
  )),
  frame("/forgot-password", "link sent", () => (
    <AuthFrame path="/forgot-password">
      <ForgotPasswordHeading />
      <Preview state={{ status: "sent", email: EMAIL }}>
        <ForgotPasswordForm />
      </Preview>
    </AuthFrame>
  )),
  frame("/update-password", "default", () => (
    <AuthFrame path="/update-password">
      <UpdatePasswordHeading />
      <UpdatePasswordForm />
    </AuthFrame>
  )),
  frame("/update-password", "link expired", () => (
    <AuthFrame path="/update-password">
      <UpdatePasswordHeading />
      <Preview
        state={{
          status: "error",
          message: "Your reset link has expired. Request a new one to set a password.",
        }}
      >
        <UpdatePasswordForm />
      </Preview>
    </AuthFrame>
  )),
  frame("/auth/confirm", "incomplete link", () => (
    <AuthServer path="/auth/confirm" name="authConfirm" />
  )),
  frame("/auth/error", "link expired", () => (
    <AuthServer path="/auth/error?code=link_expired" name="authError" />
  )),
  frame("/auth/error", "unknown code", () => (
    <AuthServer path="/auth/error" name="authErrorUnknown" />
  )),
];

// ---------------------------------------------------------------------------------------------------------------------
// CLI: /cli/approve, each answer its page gives, in the auth card.

const USER_CODE = "WDJB-MJHT";
const CLIENT = "sams-mbp (macOS)";

function Approve({
  query = `?code=${USER_CODE}`,
  children,
}: {
  query?: string;
  children: React.ReactNode;
}) {
  return <AuthFrame path={`/cli/approve${query}`}>{children}</AuthFrame>;
}

const settled = (["expired", "approved", "used", "denied"] as const).map((state) =>
  frame("/cli/approve", `code ${state}`, () => (
    <Approve>
      <ApproveNotice {...SETTLED_COPY[state]} />
    </Approve>
  )),
);

const cli: InventoryFrame[] = [
  frame("/cli/approve", "enter code", () => (
    <Approve query="">
      <ApproveCodeForm />
    </Approve>
  )),
  frame("/cli/approve", "malformed code", () => (
    <Approve query="?code=WDJB">
      <ApproveCodeForm code="WDJB" error="Codes are 8 letters, like WDJB-MJHT." />
    </Approve>
  )),
  frame("/cli/approve", "unknown code", () => (
    <Approve>
      <ApproveCodeForm
        code={USER_CODE}
        error="No login has that code. Check your terminal, or run session-coach login again."
      />
    </Approve>
  )),
  frame("/cli/approve", "pending request", () => (
    <Approve>
      <ApproveRequest
        request={{
          userCode: USER_CODE,
          clientName: CLIENT,
          requestedIp: "203.0.113.24",
          requestedAgo: "1 minute ago",
          secondsLeft: 522,
        }}
      />
    </Approve>
  )),
  frame("/cli/approve", "approved", () => (
    <Approve>
      <ApproveDone done="approved" clientName={CLIENT} />
    </Approve>
  )),
  frame("/cli/approve", "denied", () => (
    <Approve>
      <ApproveDone done="denied" clientName={CLIENT} />
    </Approve>
  )),
  ...settled,
  frame("/cli/approve", "too many codes", () => (
    <Approve>
      <ApproveNotice
        word="Slow down"
        title="Too many codes"
        message="Too many CLI login requests in the last hour. Try again in 12 minutes."
      />
    </Approve>
  )),
  frame("/cli/approve", "lookup failed", () => (
    <Approve>
      <ApproveNotice
        title="Couldn't look up that code"
        message="Reload the page to try again."
        action={
          <Link
            href={`/cli/approve?code=${USER_CODE}`}
            className={buttonVariants({ variant: "secondary" })}
          >
            Try again
          </Link>
        }
      />
    </Approve>
  )),
];

// ---------------------------------------------------------------------------------------------------------------------
// Today: /dashboard in each branch of app/(app)/dashboard/page.tsx, then the daily email that points at it.

const GREETING = "Evening, Sam";
const HABIT = "You own 4 of 12 decisions · 9 explained";
const DEFEND_LINK = (
  <Link href="/defend" className={buttonVariants({ variant: "secondary" })}>
    Defend a decision
  </Link>
);

function Today({ dueCount = 0, children }: { dueCount?: number; children: React.ReactNode }) {
  return (
    <AppFrame path="/dashboard" dueCount={dueCount}>
      <TodayColumn>{children}</TodayColumn>
    </AppFrame>
  );
}

function FirstVisit() {
  return (
    <TodayView
      greeting={GREETING}
      lede="A few minutes of setup, then your agent's decisions turn into cards."
      habit={null}
      hero={
        <TodayMessage
          title="Send your first session"
          description="Log in with the CLI, then send the session you just finished. It shows up here within a minute."
          action={
            <>
              {/* Not autoOpen: on the canvas that would open the guide over the whole page. */}
              <SetupGuide />
              <Link href="/setup" className={buttonVariants({ variant: "secondary" })}>
                Open setup
              </Link>
            </>
          }
        />
      }
    />
  );
}

function Due({ before }: { before?: React.ReactNode }) {
  return (
    <TodayView
      greeting={GREETING}
      lede="Explain it from memory first. The why comes after."
      before={before}
      habit={HABIT}
      hero={<NextCard card={SAMPLE_QUEUE[0]!} left={SAMPLE_QUEUE.length} />}
    />
  );
}

function Done({ description }: { description: string }) {
  return (
    <TodayView
      greeting={GREETING}
      lede="A few minutes a day is what makes it stick."
      habit={HABIT}
      hero={
        <TodayMessage
          title="You're done for today"
          description={description}
          action={DEFEND_LINK}
        />
      }
    />
  );
}

function EmailScreen() {
  return <div className="flex h-full flex-col bg-page">{useServerScreen("email")}</div>;
}

const today: InventoryFrame[] = [
  frame("/dashboard", "first visit", () => (
    <Today>
      <FirstVisit />
    </Today>
  )),
  frame("/dashboard", "first visit, setup guide open", () => (
    <AppFrame path="/dashboard" dueCount={0}>
      <OpenDialog trigger="Get started">
        <TodayColumn>
          <FirstVisit />
        </TodayColumn>
      </OpenDialog>
    </AppFrame>
  )),
  frame("/dashboard", "cards on the way", () => (
    <Today>
      <TodayView
        greeting={GREETING}
        lede="Your first cards are being written."
        habit={null}
        hero={
          <TodayMessage
            title="Your cards are on the way"
            description="Each session is read for the decisions your agent made. They land here, at most 5 a day."
          />
        }
      />
    </Today>
  )),
  frame("/dashboard", "cards due", () => (
    <Today dueCount={SAMPLE_QUEUE.length}>
      <Due />
    </Today>
  )),
  frame("/dashboard", "cards due, new project", () => (
    <Today dueCount={SAMPLE_QUEUE.length}>
      <Due before={<ProjectSetupCard repo="rapporteur" />} />
    </Today>
  )),
  frame("/dashboard", "done for today", () => (
    <Today>
      <Done description="Your next card comes back tomorrow." />
    </Today>
  )),
  frame("/dashboard", "daily cap reached", () => (
    <Today>
      <Done description="You did 5 cards today. The rest come back tomorrow." />
    </Today>
  )),
  frame("/dashboard", "nothing scheduled", () => (
    <Today>
      <Done description="Nothing is due. New sessions bring new cards." />
    </Today>
  )),
  frame("/dashboard", "loading", () => (
    <AppFrame path="/dashboard" dueCount={0}>
      <TodayLoading />
    </AppFrame>
  )),
  frame("/dashboard", "error", () => (
    <AppFrame path="/dashboard" dueCount={0}>
      <DashboardError error={SAMPLE_ERROR} retry={noop} />
    </AppFrame>
  )),
  frame("email", "daily review", () => <EmailScreen />, { width: 560, height: 520 }),
];

// ---------------------------------------------------------------------------------------------------------------------
// Review: the queue (/review) and one card (/review/[cardId]).

const CARD_PATH = `/review/${SAMPLE_QUIZ_CARD.id}`;
const NEXT = `/review/${SAMPLE_REVIEW_QUEUE[1]!.id}`;
const ANSWER =
  "The token is one learner. An office shares one IP, so an IP limit blocks the whole office.";

function Queue({ dueCount = 0, children }: { dueCount?: number; children: React.ReactNode }) {
  return (
    <AppFrame path="/review" dueCount={dueCount}>
      <Container>
        <ReviewHeader />
        {children}
      </Container>
    </AppFrame>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <AppFrame path={CARD_PATH}>
      <Container>
        <Quiz>{children}</Quiz>
      </Container>
    </AppFrame>
  );
}

function Result({ grade, skipped = false }: { grade: Grade; skipped?: boolean }) {
  return (
    <Card>
      <QuizHeader card={SAMPLE_QUIZ_CARD} />
      <QuizResult grade={grade} answer={skipped ? "" : ANSWER} skipped={skipped} nextHref={NEXT} />
    </Card>
  );
}

function Answer({
  answer,
  error = null,
  pending = null,
}: Partial<React.ComponentProps<typeof QuizAnswer>>) {
  return (
    <Card>
      <QuizHeader card={SAMPLE_QUIZ_CARD} />
      <QuizAnswer
        question={SAMPLE_QUIZ_CARD.question}
        answer={answer ?? ""}
        error={error}
        pending={pending}
      />
    </Card>
  );
}

const cardless = (
  [
    ["no sessions", { reason: "no-sessions" }],
    ["session being read", { reason: "processing" }],
    ["session failed", { reason: "failed", sessionId: SAMPLE_SESSION.id }],
    ["sessions gave none", { reason: "no-cards" }],
  ] as const
).map(([state, reason]) =>
  frame("/review", `no cards yet, ${state}`, () => (
    <Queue>
      <NoCardsYetEmpty cardless={reason} />
    </Queue>
  )),
);

const review: InventoryFrame[] = [
  frame("/review", "cards due", () => (
    <Queue dueCount={SAMPLE_REVIEW_QUEUE.length}>
      <QueueList queue={SAMPLE_REVIEW_QUEUE} />
    </Queue>
  )),
  frame("/review", "done for today", () => (
    <Queue>
      <DoneForTodayEmpty cap={5} />
    </Queue>
  )),
  frame("/review", "all caught up", () => (
    <Queue>
      <AllCaughtUpEmpty next="tomorrow" />
    </Queue>
  )),
  frame("/review", "all caught up, nothing scheduled", () => (
    <Queue>
      <AllCaughtUpEmpty />
    </Queue>
  )),
  ...cardless,
  frame("/review", "loading", () => (
    <AppFrame path="/review">
      <ReviewLoading />
    </AppFrame>
  )),
  frame("/review", "error", () => (
    <AppFrame path="/review">
      <ReviewError error={SAMPLE_ERROR} retry={noop} />
    </AppFrame>
  )),
  frame("/review/[cardId]", "answering", () => (
    <Card>
      <QuizView card={SAMPLE_QUIZ_CARD} nextHref={NEXT} />
    </Card>
  )),
  frame("/review/[cardId]", "paste blocked", () => <Answer error={PASTE_OFF} />),
  frame("/review/[cardId]", "scoring", () => <Answer answer={ANSWER} pending="answer" />),
  frame("/review/[cardId]", "result, explained", () => <Result grade={SAMPLE_GRADES[2]} />),
  frame("/review/[cardId]", "result, partial", () => <Result grade={SAMPLE_GRADES[1]} />),
  frame("/review/[cardId]", "result, missed", () => <Result grade={SAMPLE_GRADES[0]} />),
  frame("/review/[cardId]", "I don't know yet, here's the why", () => (
    <Result grade={{ ...SAMPLE_GRADES[0], dropped: false }} skipped />
  )),
  frame("/review/[cardId]", "mastered", () => (
    <Result grade={{ ...SAMPLE_GRADES[2], nextDue: null }} />
  )),
  frame("/review/[cardId]", "loading", () => (
    <AppFrame path={CARD_PATH}>
      <CardLoading />
    </AppFrame>
  )),
  frame("/review/[cardId]", "error", () => (
    <AppFrame path={CARD_PATH}>
      <CardError error={SAMPLE_ERROR} retry={noop} />
    </AppFrame>
  )),
  frame("/review/[cardId]", "not found", () => (
    <AppFrame path="/review/gone">
      <CardNotFound />
    </AppFrame>
  )),
];

// ---------------------------------------------------------------------------------------------------------------------
// Defend: each step of DefendFlow, drawn at a fixed moment, since the timed steps need the API.

const DEFEND_CARD: DefendCard = {
  decision: SAMPLE_QUIZ_CARD.decision,
  sessionName: SAMPLE_QUIZ_CARD.sessionName,
  repo: "session-coach",
};
const DEFENDED = "defended (timed, follow-up)";

function Defend({ children }: { children: React.ReactNode }) {
  return (
    <AppFrame path="/defend">
      <Container>
        <DefendColumn>{children}</DefendColumn>
      </Container>
    </AppFrame>
  );
}

const timeUp = (["empty", "late", "failed"] as TimeUpReason[]).map((reason) =>
  frame("/defend", `time up, ${reason}`, () => (
    <Defend>
      <DefendResult result={null} card={null} reason={reason} />
    </Defend>
  )),
);

const defend: InventoryFrame[] = [
  frame("/defend", "start", () => (
    <Defend>
      <DefendStart defendable={9} onStart={noop} />
    </Defend>
  )),
  frame("/defend", "nothing to defend", () => (
    <Defend>
      <NothingToDefend />
    </Defend>
  )),
  frame("/defend", "step 1, answering", () => (
    <Defend>
      <DefendTimed
        followUp={false}
        card={DEFEND_CARD}
        question={SAMPLE_QUIZ_CARD.question}
        left={128}
        total={180}
        answer="An office shares one IP, so"
      />
    </Defend>
  )),
  frame("/defend", "follow-up", () => (
    <Defend>
      <DefendTimed
        followUp
        card={DEFEND_CARD}
        question="What would a learner on a shared school network see if the limit were per IP?"
        left={74}
        total={120}
        answer=""
      />
    </Defend>
  )),
  frame("/defend", "defended", () => (
    <Defend>
      <DefendResult result={{ score: 2, missing: "", label: DEFENDED }} card={DEFEND_CARD} />
    </Defend>
  )),
  frame("/defend", "not defended", () => (
    <Defend>
      <DefendResult
        result={{ score: 1, missing: SAMPLE_GRADES[1].missing, label: DEFENDED }}
        card={DEFEND_CARD}
      />
    </Defend>
  )),
  ...timeUp,
  frame("/defend", "loading", () => (
    <AppFrame path="/defend">
      <DefendLoading />
    </AppFrame>
  )),
  frame("/defend", "error", () => (
    <AppFrame path="/defend">
      <DefendError error={SAMPLE_ERROR} retry={noop} />
    </AppFrame>
  )),
];

// ---------------------------------------------------------------------------------------------------------------------
// Sessions: /s/[id] through SessionView's branches. No userId, so no Realtime subscription.

const SESSION_PATH = `/s/${SAMPLE_SESSION.id}`;

/** The first sample card once answered: its why and evidence open, the rest still locked. */
const ANSWERED_CARD: CardView = {
  id: "sample-card-0",
  position: 0,
  decision: SAMPLE_SESSION_CARDS[0]!.decision,
  question: SAMPLE_SESSION_CARDS[0]!.question,
  why: SAMPLE_GRADES[2].why,
  source: "stated",
  evidence: SAMPLE_GRADES[2].evidence,
  files: ["apps/web/src/app/api/sessions/route.ts"],
  flagged: false,
};

function Session({
  session = {},
  cards = SAMPLE_SESSION_CARDS,
  stuck,
}: {
  session?: Partial<SessionSummary>;
  cards?: React.ComponentProps<typeof SessionView>["cards"];
  stuck?: boolean;
}) {
  return (
    <AppFrame path={SESSION_PATH}>
      <Quiz>
        <SessionView
          session={{ ...SAMPLE_SESSION, ...session }}
          cards={cards}
          now={SAMPLE_SESSION_NOW}
          stuck={stuck}
        />
      </Quiz>
    </AppFrame>
  );
}

const sessions: InventoryFrame[] = [
  frame("/s/[id]", "ready, cards to answer", () => <Session />),
  frame("/s/[id]", "ready, one answered", () => (
    <Session cards={[{ ...ANSWERED_CARD, locked: false }, SAMPLE_SESSION_CARDS[1]!]} />
  )),
  frame("/s/[id]", "pending", () => <Session session={{ status: "pending" }} cards={[]} />),
  frame("/s/[id]", "processing", () => <Session session={{ status: "processing" }} cards={[]} />),
  frame("/s/[id]", "failed", () => (
    <Session
      session={{ status: "failed", error: "The session log couldn't be read." }}
      cards={[]}
    />
  )),
  frame("/s/[id]", "stuck", () => <Session session={{ status: "processing" }} cards={[]} stuck />),
  frame("/s/[id]", "no decisions", () => <Session cards={[]} />),
  frame("/s/[id]", "loading", () => (
    <AppFrame path={SESSION_PATH}>
      <SessionLoading />
    </AppFrame>
  )),
  frame("/s/[id]", "error", () => (
    <AppFrame path={SESSION_PATH}>
      <SessionError error={SAMPLE_ERROR} retry={noop} />
    </AppFrame>
  )),
  frame("/s/[id]", "not found", () => (
    <AppFrame path="/s/gone">
      <SessionNotFound />
    </AppFrame>
  )),
];

// ---------------------------------------------------------------------------------------------------------------------
// Progress.

const progress: InventoryFrame[] = [
  frame("/progress", "with data", () => (
    <AppFrame path="/progress">
      <ProgressSummary data={SAMPLE_PROGRESS} />
    </AppFrame>
  )),
  frame("/progress", "filtered to a project", () => (
    <AppFrame path="/progress?repo=session-coach">
      <ProgressSummary
        data={{
          ...SAMPLE_PROGRESS,
          repo: "session-coach",
          repos: SAMPLE_PROJECTS.map((project) => project.repo),
        }}
      />
    </AppFrame>
  )),
  frame("/progress", "no cards", () => (
    <AppFrame path="/progress" dueCount={0}>
      <ProgressEmpty empty={<NoCardsYetEmpty />} />
    </AppFrame>
  )),
  frame("/progress", "no reviews", () => (
    <AppFrame path="/progress">
      <ProgressEmpty empty={<NoReviewsEmpty />} />
    </AppFrame>
  )),
  frame("/progress", "loading", () => (
    <AppFrame path="/progress">
      <ProgressLoading />
    </AppFrame>
  )),
  frame("/progress", "error", () => (
    <AppFrame path="/progress">
      <ProgressError error={SAMPLE_ERROR} retry={noop} />
    </AppFrame>
  )),
];

// ---------------------------------------------------------------------------------------------------------------------
// Setup.

function Setup({ connected = false }: { connected?: boolean }) {
  return (
    <AppFrame path="/setup" dueCount={0}>
      <Container>
        <SetupView
          steps={
            <SetupSteps
              progress={
                connected
                  ? { device: SAMPLE_DEVICES[0]!.label, sessions: 3 }
                  : { device: null, sessions: 0 }
              }
            />
          }
          devices={<DeviceSection initialTokens={connected ? SAMPLE_DEVICES : []} />}
        />
      </Container>
    </AppFrame>
  );
}

const setup: InventoryFrame[] = [
  frame("/setup", "no device", () => <Setup />),
  frame("/setup", "connected", () => <Setup connected />),
  frame("/setup", "token dialog open", () => (
    <OpenDialog trigger="Use a token instead">
      <Setup />
    </OpenDialog>
  )),
  frame("/setup", "loading", () => (
    <AppFrame path="/setup" dueCount={0}>
      <SetupLoading />
    </AppFrame>
  )),
  frame("/setup", "error", () => (
    <AppFrame path="/setup" dueCount={0}>
      <SetupError error={SAMPLE_ERROR} retry={noop} />
    </AppFrame>
  )),
];

// ---------------------------------------------------------------------------------------------------------------------
// Settings: one page; each state is what its reads hand SettingsView.

function Settings(props: Partial<React.ComponentProps<typeof SettingsView>>) {
  return (
    <AppFrame path="/settings">
      <Container>
        <SettingsHeader />
        <SettingsView
          profile={SAMPLE_PROFILE}
          timezones={SAMPLE_TIMEZONES}
          projects={SAMPLE_PROJECTS}
          devices={SAMPLE_DEVICES}
          report={SAMPLE_REPORT}
          {...props}
        />
      </Container>
    </AppFrame>
  );
}

const settings: InventoryFrame[] = [
  frame("/settings", "default", () => <Settings />),
  frame("/settings", "no projects", () => <Settings projects={[]} />),
  frame("/settings", "no devices", () => <Settings devices={[]} />),
  frame("/settings", "report on", () => (
    <Settings
      report={{
        ...SAMPLE_REPORT,
        on: true,
        repos: SAMPLE_PROJECTS.map(({ repo }, i) => ({ repo, shown: i === 0 })),
      }}
    />
  )),
  frame("/settings", "reads failed", () => (
    <Settings projects={null} devices={null} report={null} />
  )),
  frame("/settings", "delete dialog open", () => (
    <OpenDialog trigger="Delete account">
      <Settings />
    </OpenDialog>
  )),
];

// ---------------------------------------------------------------------------------------------------------------------
// Members.

const members: InventoryFrame[] = [
  frame("/members", "v2 note", () => (
    <AppFrame path="/members">
      <Container>
        <AppPageHeader title="Members" description="The people who share your projects." />
        <MembersView name="Sam Rivera" email={EMAIL} initials="SR" />
      </Container>
    </AppFrame>
  )),
];

// ---------------------------------------------------------------------------------------------------------------------
// Report: the public /r/[slug], in the marketing layout, signed out.

const SAMPLE_PUBLIC_REPORT: LoadedReport = {
  name: "Sam Rivera",
  owned: 3,
  defended: 1,
  repos: [
    {
      repo: "session-coach",
      owned: 3,
      defended: 1,
      decisions: [
        {
          decision: "Rate limit the upload route per token, not per IP",
          quote: "Key the limiter on the CLI token so one office IP can't block everyone.",
          file: "apps/web/src/app/api/sessions/route.ts",
          ownedOn: "2026-10-21",
          defendedOn: "2026-10-30",
        },
        {
          decision: "Return 429 with a Retry-After header",
          quote: "Send Retry-After so the CLI knows when to try again.",
          file: null,
          ownedOn: "2026-10-24",
          defendedOn: null,
        },
        {
          decision: "Skip unknown JSONL line types instead of throwing",
          quote: "New line types should not break old CLIs, so skip what we don't know.",
          file: "packages/shared/src/session.ts",
          ownedOn: "2026-10-28",
          defendedOn: null,
        },
      ],
    },
  ],
};

function Report({ report }: { report: LoadedReport }) {
  return (
    <PublicFrame path="/r/3f9c2a7e">
      <Container>
        <ReportView report={report} />
      </Container>
    </PublicFrame>
  );
}

const report: InventoryFrame[] = [
  frame("/r/[slug]", "with decisions", () => <Report report={SAMPLE_PUBLIC_REPORT} />),
  frame("/r/[slug]", "nothing owned yet", () => (
    <Report report={{ name: "Sam Rivera", owned: 0, defended: 0, repos: [] }} />
  )),
  frame("/r/[slug]", "not shared", () => <Report report="off" />),
  frame("/r/[slug]", "too many requests", () => <Report report="limited" />),
  frame("/r/[slug]", "error", () => <Report report="error" />),
];

// ---------------------------------------------------------------------------------------------------------------------
// Errors: the app-wide boundaries.

const errors: InventoryFrame[] = [
  frame("not-found", "unknown URL", () => (
    <PublicFrame path="/no-such-page">
      <NotFoundBody />
    </PublicFrame>
  )),
  frame("error", "outside the app", () => (
    <FrameWindow path="/pricing">
      <RootError error={SAMPLE_ERROR} retry={noop} />
    </FrameWindow>
  )),
  frame("(app)/not-found", "default", () => (
    <AppFrame path="/s/gone">
      <AppNotFound />
    </AppFrame>
  )),
  frame("(app)/error", "default", () => (
    <AppFrame path="/settings">
      <AppError error={SAMPLE_ERROR} retry={noop} />
    </AppFrame>
  )),
];

/** The inventory, one row per area, in the order the sidebar and the site present them. */
export const INVENTORY: { area: string; frames: InventoryFrame[] }[] = [
  { area: "Marketing", frames: marketing },
  { area: "Auth", frames: auth },
  { area: "CLI", frames: cli },
  { area: "Today", frames: today },
  { area: "Review", frames: review },
  { area: "Defend", frames: defend },
  { area: "Sessions", frames: sessions },
  { area: "Progress", frames: progress },
  { area: "Setup", frames: setup },
  { area: "Settings", frames: settings },
  { area: "Members", frames: members },
  { area: "Report", frames: report },
  { area: "Errors", frames: errors },
];
