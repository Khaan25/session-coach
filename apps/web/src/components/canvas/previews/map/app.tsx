"use client";

// App-wide states for the app map: the root 404, the server error page outside the app, the (app) error boundary
// inside the shell, and the loading skeletons. Each is the real component: NotFoundBody, ErrorPage, (app)/error.tsx,
// and MeasuredSkeleton drawn from the same sample view the page's MeasuredSuspense uses. The error components log
// the synthetic error to the console, as they would a real one.

import AppError from "@/app/(app)/error";
import { Container } from "@/components/app/container";
import { MeasuredSkeleton } from "@/components/app/measured-suspense";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import {
  SAMPLE_NOW,
  SAMPLE_OWNERSHIP,
  SAMPLE_QUEUE,
  SAMPLE_SESSIONS,
} from "@/components/dashboard/dashboard-sample";
import { ErrorPage } from "@/components/errors/error-page";
import { NotFoundBody } from "@/components/errors/not-found-body";
import { SAMPLE_QUIZ_CARD } from "@/components/review/review-sample";
import { QuizView } from "@/components/review/review-views";
import {
  SAMPLE_SESSION,
  SAMPLE_SESSION_CARDS,
  SAMPLE_SESSION_NOW,
} from "@/components/sessions/session-sample";
import { SessionRows } from "@/components/sessions/session-list";
import { SessionView } from "@/components/sessions/session-view";

import { AppFrame, FRAME_SESSIONS, FrameWindow, PublicFrame } from "../frames";

/** A server error as Next hands it to a boundary: a digest, the reference code, and no message to show. */
const SAMPLE_ERROR = Object.assign(new Error("Synthetic canvas error"), { digest: "3790123546" });
const retry = () => {};

/** app/not-found.tsx: every unknown URL, with the marketing nav. */
export function MapNotFoundPage() {
  return (
    <PublicFrame path="/pricng">
      <NotFoundBody />
    </PublicFrame>
  );
}

/** app/error.tsx and global-error.tsx (ErrorPage): outside the app shell, the brand and the error only. */
export function MapServerErrorPage() {
  return (
    <FrameWindow path="/how-it-works">
      <ErrorPage error={SAMPLE_ERROR} retry={retry} />
    </FrameWindow>
  );
}

/** (app)/error.tsx: inside the shell, so the sidebar stays and the learner can move on. */
export function MapAppErrorPage() {
  return (
    <AppFrame path="/settings">
      <AppError error={SAMPLE_ERROR} retry={retry} />
    </AppFrame>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Loading: the skeleton each page's MeasuredSuspense draws, from the same sample view.

export function MapDashboardLoading() {
  return (
    <AppFrame path="/dashboard">
      <Container>
        <MeasuredSkeleton label="Loading your dashboard">
          <DashboardView
            firstVisit={false}
            tabs={null}
            repo={null}
            queue={SAMPLE_QUEUE}
            due={SAMPLE_QUEUE}
            empty={null}
            ownership={SAMPLE_OWNERSHIP}
            sessions={<SessionRows rows={SAMPLE_SESSIONS} now={SAMPLE_NOW} />}
          />
        </MeasuredSkeleton>
      </Container>
    </AppFrame>
  );
}

export function MapSessionLoading() {
  return (
    <AppFrame path={`/s/${FRAME_SESSIONS[0]!.id}`}>
      <MeasuredSkeleton label="Loading the session">
        <SessionView
          session={SAMPLE_SESSION}
          cards={SAMPLE_SESSION_CARDS}
          now={SAMPLE_SESSION_NOW}
        />
      </MeasuredSkeleton>
    </AppFrame>
  );
}

export function MapReviewCardLoading() {
  return (
    <AppFrame path="/review/c2">
      <Container>
        <MeasuredSkeleton label="Loading the card">
          <QuizView card={SAMPLE_QUIZ_CARD} nextHref={null} />
        </MeasuredSkeleton>
      </Container>
    </AppFrame>
  );
}
