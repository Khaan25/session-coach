"use client";

// The learning routes' states that the picked options don't draw: a page whose data didn't load, and a row that isn't
// there. The not-found pages are the real ones; a load error is the real LoadErrorState's two faces (it reads the
// browser's connection, so the canvas picks the face). Synthetic data only; no answer key is shown.

import CardNotFound from "@/app/(app)/review/[cardId]/not-found";
import SessionNotFound from "@/app/(app)/s/[id]/not-found";
import { Container } from "@/components/app/container";
import { NoCardsYetEmpty, NoReviewsEmpty } from "@/components/app/empty-state";
import { LoadFailedState, OfflineState } from "@/components/app/error-state";
import { ProgressEmpty } from "@/components/progress/progress-view";
import { Button } from "@/components/ui/button";

import { AppFrame } from "../frames";

/** A page's error boundary (LoadErrorState): load failed, or offline when the browser has no connection. */
function LoadError({ noun, offline }: { noun: string; offline?: boolean }) {
  const action = <Button>Try again</Button>;
  return offline ? (
    <OfflineState noun={noun} action={action} />
  ) : (
    <LoadFailedState noun={noun} action={action} />
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// /dashboard

export function MapDashboardError({ offline }: { offline?: boolean }) {
  return (
    <AppFrame path="/dashboard">
      <Container>
        <LoadError noun="your sessions" offline={offline} />
      </Container>
    </AppFrame>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// /s/[id] and /review: the real not-found pages and the review's error boundary.

export function MapSessionNotFound() {
  return (
    <AppFrame path="/s/5e0c71aa">
      <SessionNotFound />
    </AppFrame>
  );
}

export function MapReviewError() {
  return (
    <AppFrame path="/review" dueCount={0}>
      <Container>
        <LoadError noun="your review" />
      </Container>
    </AppFrame>
  );
}

export function MapCardNotFound() {
  return (
    <AppFrame path="/review/9b1f02cd">
      <CardNotFound />
    </AppFrame>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// /progress

export function MapProgressEmpty({ state }: { state: "no-cards" | "no-reviews" | "error" }) {
  return (
    <AppFrame path="/progress" dueCount={0}>
      {state === "error" ? (
        <Container>
          <LoadError noun="your progress" />
        </Container>
      ) : (
        <ProgressEmpty empty={state === "no-cards" ? <NoCardsYetEmpty /> : <NoReviewsEmpty />} />
      )}
    </AppFrame>
  );
}
