"use client";

// The learning routes' states that the picked options don't draw: a page whose data didn't load, a row that isn't
// there, the review queue's empty reasons, Progress before any answer, and Defend it's other endings. Each reuses the
// real empty and error presets (components/app/*-state.tsx) inside the picked page's frame. Copy from the route files
// under app/(app)/. Synthetic data only; no answer key is shown.

import { ArrowRightIcon } from "@phosphor-icons/react";
import type { QuestionLevel } from "@session-coach/shared/project";
import Link from "next/link";
import { useState } from "react";

import { Container } from "@/components/app/container";
import {
  AllCaughtUpEmpty,
  DoneForTodayEmpty,
  NoCardsYetEmpty,
  NoReviewsEmpty,
} from "@/components/app/empty-state";
import { LoadFailedState, NotFoundState, OfflineState } from "@/components/app/error-state";
import { ScoreBadge, type Score } from "@/components/app/score-badge";
import { LevelPicker } from "@/components/projects/level-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";

import { AppFrame, FRAME_SESSIONS } from "../frames";
import { MapAppPage } from "./parts";

const REVIEW_DESCRIPTION =
  "Explain each decision back in your own words. Pick a card to see where it is and what your answer will do to it.";
const PROGRESS_DESCRIPTION = "What to do today, and how a card becomes yours.";

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

/**
 * ProjectSetupCard: a new repo's first-time question, above the dashboard. Save keeps the level, Not now keeps simple;
 * either way the card goes and the level can change in Settings. The real card saves through a Server Action.
 */
export function MapProjectSetupCard({ repo }: { repo: string }) {
  const [level, setLevel] = useState<QuestionLevel>("simple");
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Set up {repo}: how hard should questions be?</h2>
        </CardTitle>
        <CardDescription>
          Applies to new sessions from this repo. You can change it in Settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LevelPicker label="Question level" value={level} onValueChange={setLevel} />
      </CardContent>
      <CardFooter>
        <Button>Save</Button>
        <Button variant="ghost">Not now</Button>
      </CardFooter>
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// /s/[id]

export function MapSessionNotFound() {
  return (
    <MapAppPage path="/s/5e0c71aa" title="Session">
      <NotFoundState />
    </MapAppPage>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// /review

export type ReviewEmpty = "done" | "caught-up" | "no-cards" | "on-the-way" | "error";

export function MapReviewEmpty({ state }: { state: ReviewEmpty }) {
  return (
    <MapAppPage path="/review" title="Review" description={REVIEW_DESCRIPTION} dueCount={0}>
      {state === "done" && <DoneForTodayEmpty cap={5} />}
      {state === "caught-up" && <AllCaughtUpEmpty next="tomorrow" />}
      {state === "no-cards" && <NoCardsYetEmpty />}
      {state === "on-the-way" && <NoCardsYetEmpty cardless={{ reason: "processing" }} />}
      {state === "error" && <LoadError noun="your review" />}
    </MapAppPage>
  );
}

export function MapCardNotFound() {
  return (
    <MapAppPage path="/review/9b1f02cd" title="Explain it back">
      <NotFoundState
        noun="Card"
        action={
          <Link href="/review" className={buttonVariants({ variant: "secondary" })}>
            Back to the queue
          </Link>
        }
      />
    </MapAppPage>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// /progress

export function MapProgressEmpty({ state }: { state: "no-cards" | "no-reviews" | "error" }) {
  return (
    <MapAppPage path="/progress" title="Progress" description={PROGRESS_DESCRIPTION} dueCount={0}>
      {state === "no-cards" && <NoCardsYetEmpty />}
      {state === "no-reviews" && <NoReviewsEmpty />}
      {state === "error" && <LoadError noun="your progress" />}
    </MapAppPage>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// /defend, in the picked design (C, one focused column). Endings from components/defend/defend-flow.tsx.

const DECISION = "Rate limit uploads per CLI token, not per IP";

const ENDING = {
  "not-defended": {
    score: 1 as Score,
    title: "Not defended this time",
    body: "Explain it again in your next review, then defend it again.",
    missing:
      "Why an IP is the wrong key: learners behind one office IP would block each other's uploads.",
  },
  "time-up": {
    score: null,
    title: "Time's up",
    body: "Nothing was typed before the clock ran out, so this one ends here. Start again for another decision.",
    missing: null,
  },
};

export function MapDefendEnding({ kind }: { kind: keyof typeof ENDING }) {
  const end = ENDING[kind];
  const again = (
    <Button variant={end.score === null ? "default" : "secondary"}>Defend another</Button>
  );
  return (
    <AppFrame path="/defend" crumb="Defend it">
      <Container>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-6">
          <div className="flex flex-col gap-2">
            {end.score !== null && <ScoreBadge score={end.score} />}
            <h1 className="type-heading">{end.title}</h1>
            <p className="type-body text-text-2">
              {end.score !== null && (
                <>
                  &ldquo;{DECISION}&rdquo;, from {FRAME_SESSIONS[0].title}.{" "}
                </>
              )}
              {end.body}
            </p>
          </div>
          {end.missing && (
            <DataList>
              <DataListItem>
                <DataListLabel>What was missing</DataListLabel>
                <DataListValue>{end.missing}</DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Why not &ldquo;verified&rdquo;</DataListLabel>
                <DataListValue>
                  Paste was off, but help off screen is still possible. Defended is the honest word.
                </DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Your reviews</DataListLabel>
                <DataListValue>
                  Unchanged: a defense never moves a card&rsquo;s schedule.
                </DataListValue>
              </DataListItem>
            </DataList>
          )}
          <div className="flex flex-col gap-3">
            <h2 className="type-label text-text-2">What to do next</h2>
            <div className="flex flex-wrap gap-3">
              {end.score !== null ? (
                <>
                  <Link href="/review" className={buttonVariants()}>
                    See today&rsquo;s reviews
                    <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
                  </Link>
                  {again}
                </>
              ) : (
                <>
                  {again}
                  <Link href="/dashboard" className={buttonVariants({ variant: "secondary" })}>
                    Back to dashboard
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </Container>
    </AppFrame>
  );
}
