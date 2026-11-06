"use client";

// Every screen on /canvas, one per step of the flow. Each is the route's real components, fed the synthetic rows its
// own loading skeleton uses, inside a frame of the route's layout (frames.tsx). Nothing here calls an API.

import Link from "next/link";
import { useEffect, useRef } from "react";

import DashboardError from "@/app/(app)/dashboard/error";
import TodayLoading from "@/app/(app)/dashboard/loading";
import { TodayColumn } from "@/app/(app)/dashboard/dashboard-sample-view";
import { Container } from "@/components/app/container";
import { AppPageHeader } from "@/components/app/page-header";
import { LoginHeading, SignUpHeading } from "@/components/auth/auth-screens";
import { LoginForm } from "@/components/auth/login-form";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { ApproveRequest } from "@/components/cli/approve-request";
import { SAMPLE_QUEUE } from "@/components/dashboard/dashboard-sample";
import { NextCard, TodayMessage, TodayView } from "@/components/dashboard/today-view";
import { DefendColumn, DefendStart } from "@/components/defend/defend-flow";
import { MembersView } from "@/components/members/members-view";
import { SetupGuide } from "@/components/onboarding/setup-guide";
import { SAMPLE_PROGRESS } from "@/components/progress/progress-sample";
import { ProgressSummary } from "@/components/progress/progress-view";
import { QuizHeader, QuizView } from "@/components/review/review-views";
import { QuizResult, QuizSendContext } from "@/components/review/quiz-form";
import {
  SAMPLE_GRADES,
  SAMPLE_QUIZ_CARD,
  SAMPLE_REVIEW_QUEUE,
} from "@/components/review/review-sample";
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
import { PortalProvider } from "@/lib/ui/portal";

import { AppFrame, AuthFrame, PublicFrame } from "./frames";
import { useServerScreen } from "./server-screens";

// ---------------------------------------------------------------------------------------------------------------------
// 1. Marketing, and the daily email: rendered on the server (see ServerScreens).

const PUBLIC_PATHS = { home: "/", howItWorks: "/how-it-works", pricing: "/pricing" } as const;

export function PublicScreen({ name }: { name: keyof typeof PUBLIC_PATHS }) {
  return <PublicFrame path={PUBLIC_PATHS[name]}>{useServerScreen(name)}</PublicFrame>;
}

export function EmailScreen() {
  return <div className="flex h-full flex-col bg-page">{useServerScreen("email")}</div>;
}

// ---------------------------------------------------------------------------------------------------------------------
// 2. Sign up and in: the auth card. The frame's DryRunContext keeps each form from calling its Server Action.

export function SignUpScreen() {
  return (
    <AuthFrame path="/sign-up">
      <SignUpHeading />
      <SignUpForm />
    </AuthFrame>
  );
}

export function LoginScreen() {
  return (
    <AuthFrame path="/login">
      <LoginHeading />
      <LoginForm />
    </AuthFrame>
  );
}

/** (standalone)/cli/approve: the same card, outside the app shell. */
export function CliApproveScreen() {
  return (
    <AuthFrame path="/cli/approve?code=WDJB-MJHT">
      <ApproveRequest
        request={{
          userCode: "WDJB-MJHT",
          clientName: "sams-mbp (macOS)",
          requestedIp: "203.0.113.24",
          requestedAgo: "1 minute ago",
          secondsLeft: 522,
        }}
      />
    </AuthFrame>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// 3 and 4. Today, in each state its page renders (app/(app)/dashboard/page.tsx), and the review between.

const GREETING = "Evening, Sam";
const HABIT = "You own 4 of 12 decisions · 9 explained";

function TodayFrame({ dueCount = 0, children }: { dueCount?: number; children: React.ReactNode }) {
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

export function TodayFirstVisitScreen() {
  return (
    <TodayFrame>
      <FirstVisit />
    </TodayFrame>
  );
}

/**
 * The first visit with the guide open, as autoOpen shows it, opened by its own trigger. The stage PortalProvider keeps
 * the dialog in this frame (the canvas item's transform is its `fixed` overlay's box); a click elsewhere closes it.
 */
export function TodayGuideOpenScreen() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[data-slot=dialog-trigger]")?.click();
  }, []);
  return (
    <AppFrame path="/dashboard" dueCount={0}>
      <div ref={ref} className="contents">
        <PortalProvider>
          <TodayColumn>
            <FirstVisit />
          </TodayColumn>
        </PortalProvider>
      </div>
    </AppFrame>
  );
}

export function SetupScreen() {
  return (
    <AppFrame path="/setup" dueCount={0}>
      <Container>
        <SetupView
          steps={<SetupSteps progress={{ device: null, sessions: 0 }} />}
          devices={<DeviceSection initialTokens={[]} />}
        />
      </Container>
    </AppFrame>
  );
}

export function TodayDueScreen() {
  return (
    <TodayFrame dueCount={SAMPLE_QUEUE.length}>
      <TodayView
        greeting={GREETING}
        lede="Explain it from memory first. The why comes after."
        habit={HABIT}
        hero={<NextCard card={SAMPLE_QUEUE[0]!} left={SAMPLE_QUEUE.length} />}
      />
    </TodayFrame>
  );
}

const CARD_PATH = `/review/${SAMPLE_QUIZ_CARD.id}`;
const NEXT = `/review/${SAMPLE_REVIEW_QUEUE[1]!.id}`;

/** Grades an answer without the API: a short wait, then the sample grade for a 2. */
const canvasSend = () =>
  new Promise<(typeof SAMPLE_GRADES)[2]>((resolve) =>
    setTimeout(() => resolve(SAMPLE_GRADES[2]), 800),
  );

/** /review/[cardId], live: type an answer and submit; the canvas grades it. */
export function ReviewAnswerScreen() {
  return (
    <AppFrame path={CARD_PATH}>
      <Container>
        <QuizSendContext value={canvasSend}>
          <QuizView card={SAMPLE_QUIZ_CARD} nextHref={NEXT} />
        </QuizSendContext>
      </Container>
    </AppFrame>
  );
}

export function ReviewResultScreen() {
  return (
    <AppFrame path={CARD_PATH}>
      <Container>
        <QuizHeader card={SAMPLE_QUIZ_CARD} />
        <QuizResult
          grade={SAMPLE_GRADES[2]}
          answer="The token is one learner. An office shares one IP, so an IP limit blocks the whole office."
          skipped={false}
          nextHref={NEXT}
        />
      </Container>
    </AppFrame>
  );
}

export function TodayDoneScreen() {
  return (
    <TodayFrame>
      <TodayView
        greeting={GREETING}
        lede="A few minutes a day is what makes it stick."
        habit={HABIT}
        hero={
          <TodayMessage
            title="You're done for today"
            description="Your next card comes back tomorrow."
            action={
              <Link href="/defend" className={buttonVariants({ variant: "secondary" })}>
                Defend a decision
              </Link>
            }
          />
        }
      />
    </TodayFrame>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// 5. Progress and the rest.

export function ProgressScreen() {
  return (
    <AppFrame path="/progress">
      <ProgressSummary data={SAMPLE_PROGRESS} />
    </AppFrame>
  );
}

/** /defend before the clock. Start does nothing here: the timed steps need the API. */
export function DefendScreen() {
  return (
    <AppFrame path="/defend">
      <Container>
        <DefendColumn>
          <DefendStart defendable={9} onStart={() => {}} />
        </DefendColumn>
      </Container>
    </AppFrame>
  );
}

export function SettingsScreen() {
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
        />
      </Container>
    </AppFrame>
  );
}

export function MembersScreen() {
  return (
    <AppFrame path="/members">
      <Container>
        <AppPageHeader title="Members" description="The people who share your projects." />
        <MembersView name="Sam Rivera" email="sam@example.com" initials="SR" />
      </Container>
    </AppFrame>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// 6. States: Today's own loading.tsx and error.tsx, the boundaries every (app) page shares the look of.

/** A server error as Next hands it to a boundary: a digest, the reference code, and no message to show. */
const SAMPLE_ERROR = Object.assign(new Error("Synthetic canvas error"), { digest: "3790123546" });

export function LoadingScreen() {
  return (
    <AppFrame path="/dashboard" dueCount={0}>
      <TodayLoading />
    </AppFrame>
  );
}

export function ErrorScreen() {
  return (
    <AppFrame path="/dashboard" dueCount={0}>
      <DashboardError error={SAMPLE_ERROR} retry={() => {}} />
    </AppFrame>
  );
}
