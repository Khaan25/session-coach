"use client";

// App-wide states for the app map: the root 404, the server error page outside the app, the (app) error boundary
// inside the shell, and the loading skeletons. Copy from app/not-found.tsx, components/errors/server-error-state.tsx
// and the (app) error.tsx files. The real error components log the thrown error; these draw the same ErrorState
// without one, so the canvas logs nothing.

import { HouseIcon, SquaresFourIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { Container } from "@/components/app/container";
import { ErrorState } from "@/components/app/error-state";
import { AppPageHeader } from "@/components/app/page-header";
import { BrandMark } from "@/components/brand-mark";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { AppFrame, FRAME_SESSIONS, FrameWindow, PublicFrame } from "../frames";
import { DecisionCardLoading, ReviewCardLoading, SessionListLoading } from "../loading";

/** A synthetic digest, the reference code Next attaches to a server error. */
const DIGEST = "3790123546";

/** app/not-found.tsx: every unknown URL, with the marketing nav. */
export function MapNotFoundPage() {
  return (
    <PublicFrame path="/pricng">
      <div className="relative isolate flex flex-1 flex-col overflow-hidden">
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-56 well sm:h-72">
          <svg className="size-full text-line-row">
            <defs>
              <pattern id="map-not-found-lines" width="8" height="28" patternUnits="userSpaceOnUse">
                <line x1="0" y1="27.5" x2="8" y2="27.5" stroke="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#map-not-found-lines)" />
          </svg>
        </div>
        <div className="mx-auto flex w-full max-w-(--container) flex-col items-start px-(--gutter-sm) pt-20 pb-72 sm:px-(--gutter) sm:pt-30 sm:pb-96">
          <p className="type-label text-text-3">Error 404</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-none tracking-tight text-balance text-text-1 sm:text-7xl">
            This page isn&apos;t <span className="italic">in the deck.</span>
          </h1>
          <p className="mt-6 max-w-lg type-body-lg text-pretty text-text-2">
            The link may be old or mistyped. Pick up from one of these instead.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/" className={buttonVariants({ size: "lg" })}>
              <HouseIcon weight="duotone" data-icon="inline-start" aria-hidden />
              Go home
            </Link>
            <Link
              href="/dashboard"
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              <SquaresFourIcon weight="duotone" data-icon="inline-start" aria-hidden />
              Open the dashboard
            </Link>
          </div>
          <p className="mt-6 type-body-sm text-text-2">
            Followed a link from Session Coach?{" "}
            <Link href="/support" className={buttonVariants({ variant: "link" })}>
              Tell support
            </Link>
          </p>
        </div>
      </div>
    </PublicFrame>
  );
}

/** ServerErrorState's copy, with Try again and the way out. */
function ServerError({ home }: { home: { href: string; label: string } }) {
  return (
    <ErrorState
      statusWord="Error"
      title={<h1>Something went wrong on our side</h1>}
      message="This page didn't load. Try again; if it keeps failing, contact support and quote the code below."
      code={`Ref ${DIGEST}`}
      action={
        <>
          <Button>Try again</Button>
          <Link href={home.href} className={buttonVariants({ variant: "secondary" })}>
            {home.label}
          </Link>
        </>
      }
    >
      <Link href="/support" className={buttonVariants({ variant: "link" })}>
        Contact support
      </Link>
    </ErrorState>
  );
}

/** app/error.tsx and global-error.tsx (ErrorPage): outside the app shell, the brand and the error only. */
export function MapServerErrorPage() {
  return (
    <FrameWindow path="/how-it-works">
      <div className="flex min-h-0 flex-1 flex-col bg-page">
        <header className="mx-auto flex h-18 w-full max-w-(--container) items-center px-(--gutter-sm) sm:h-20 sm:px-(--gutter)">
          <Link href="/" className="flex items-center gap-2 type-label text-text-1">
            <BrandMark className="size-6" />
            Session Coach
          </Link>
        </header>
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-(--gutter-sm) pb-20 sm:px-(--gutter)">
          <ServerError home={{ href: "/", label: "Go home" }} />
        </div>
      </div>
    </FrameWindow>
  );
}

/** (app)/error.tsx: inside the shell, so the sidebar stays and the learner can move on. */
export function MapAppErrorPage() {
  return (
    <AppFrame path="/settings">
      <Container>
        <ServerError home={{ href: "/dashboard", label: "Back to the dashboard" }} />
      </Container>
    </AppFrame>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Loading. The real pages stream through MeasuredSuspense, which skullet draws from the real view; these are the
// canvas's static skeletons in the same places.

export function MapDashboardLoading() {
  return (
    <AppFrame path="/dashboard">
      <Container>
        <AppPageHeader
          title="Dashboard"
          description="Your agent’s decisions, project by project. Open any “What’s this?” to learn the part next to it."
        />
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
            <Card aria-hidden>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <SessionListLoading rows={4} />
            </Card>
          </div>
          <DecisionCardLoading />
        </div>
      </Container>
    </AppFrame>
  );
}

export function MapSessionLoading() {
  return (
    <AppFrame path={`/s/${FRAME_SESSIONS[0].id}`}>
      <Container>
        <AppPageHeader title={<Skeleton className="h-7 w-96" />} />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
            <DecisionCardLoading />
            <DecisionCardLoading />
          </div>
        </div>
      </Container>
    </AppFrame>
  );
}

export function MapReviewCardLoading() {
  return (
    <AppFrame path="/review/c2">
      <Container>
        <AppPageHeader title={<Skeleton className="h-7 w-96" />} />
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="flex flex-col gap-6 lg:col-span-3">
            <ReviewCardLoading />
          </div>
        </div>
      </Container>
    </AppFrame>
  );
}
