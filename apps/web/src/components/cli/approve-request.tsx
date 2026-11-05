"use client";

import { LaptopIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { AppPageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleRow } from "@/components/ui/collapsible";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";

type Request = {
  /** XXXX-XXXX. */
  userCode: string;
  clientName: string;
  requestedIp: string | null;
  /** "2 minutes ago", written by the server. */
  requestedAgo: string;
  /** Seconds left by the server's clock when it rendered. The countdown runs from this, never the browser's clock. */
  secondsLeft: number;
};

/**
 * Counts down from the server's `initial` by monotonic time elapsed since mount, so a skewed browser clock can't
 * expire the code early or make the timer jump.
 */
function useSecondsLeft(initial: number): number {
  const [left, setLeft] = useState(initial);
  useEffect(() => {
    const mounted = performance.now();
    const id = setInterval(
      () => setLeft(initial - Math.floor((performance.now() - mounted) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [initial]);
  return left;
}

/** m:ss. */
function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * One pending CLI login, as one question: the code large, what asked, from where and when, then Approve and Deny, with
 * the explanations folded below. Nothing happens until a click, so a
 * link someone else sent can't sign their computer in to this account.
 */
export function ApproveRequest({ request }: { request: Request }) {
  const secondsLeft = useSecondsLeft(request.secondsLeft);
  const [pending, setPending] = useState<"approve" | "deny" | null>(null);
  const [done, setDone] = useState<"approved" | "denied" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approve" | "deny") {
    setPending(decision);
    setError(null);
    const response = await fetch(`/api/cli/device/${decision}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userCode: request.userCode }),
    }).catch(() => null);
    setPending(null);
    if (response?.ok) {
      setDone(decision === "approve" ? "approved" : "denied");
      return;
    }
    const body: { error?: string } | null = await response?.json().catch(() => null);
    setError(body?.error ?? "Check your connection and try again.");
  }

  if (done === "approved") {
    return (
      <>
        <ApproveHeader />
        <Card>
          <EmptyState
            variant="plain"
            title="CLI connected"
            description={`Go back to your terminal. ${request.clientName} signs in within a few seconds, and it shows up under Connected devices on Setup.`}
          />
        </Card>
      </>
    );
  }
  if (done === "denied") {
    return (
      <>
        <ApproveHeader />
        <Card>
          <EmptyState
            variant="plain"
            title="Login denied"
            description="That computer wasn't signed in. If you didn't run session-coach login yourself, nothing else is needed."
          />
        </Card>
      </>
    );
  }
  if (secondsLeft <= 0) {
    return (
      <>
        <ApproveHeader />
        <Card>
          <ErrorState
            variant="plain"
            status="warn"
            statusWord="Expired"
            title="This code expired"
            message="Run session-coach login again for a new one."
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <section
        aria-labelledby="approve-title"
        className="flex flex-col items-center gap-4 text-center"
      >
        <LaptopIcon weight="duotone" className="size-8 text-text-2" aria-hidden="true" />
        <h1 id="approve-title" className="type-heading-lg text-pretty text-text-1">
          Is this the code in your terminal?
        </h1>
        <p className="type-stat-xl text-text-1 tabular-nums">{request.userCode}</p>
        <p className="type-body-sm text-text-2">
          Approve only if you just ran session-coach login and the code matches. Approving lets that
          computer upload sessions to your account.
        </p>
      </section>

      <DataList variant="framed">
        <DataListItem>
          <DataListLabel>Code</DataListLabel>
          <DataListValue>{request.userCode}</DataListValue>
        </DataListItem>
        <DataListItem>
          <DataListLabel>Device</DataListLabel>
          <DataListValue>{request.clientName}</DataListValue>
        </DataListItem>
        <DataListItem>
          <DataListLabel>Requested from</DataListLabel>
          <DataListValue>{request.requestedIp}</DataListValue>
        </DataListItem>
        <DataListItem>
          <DataListLabel>Requested</DataListLabel>
          <DataListValue>{request.requestedAgo}</DataListValue>
        </DataListItem>
        <DataListItem>
          <DataListLabel>Expires in</DataListLabel>
          <DataListValue>
            <span className="tabular-nums">{clock(secondsLeft)}</span>
          </DataListValue>
        </DataListItem>
      </DataList>

      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            size="lg"
            onClick={() => void decide("approve")}
            disabled={pending !== null}
            aria-busy={pending === "approve"}
          >
            {pending === "approve" && <Spinner label="" />}
            Yes, approve
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => void decide("deny")}
            disabled={pending !== null}
            aria-busy={pending === "deny"}
          >
            {pending === "deny" && <Spinner label="" />}
            No, deny
          </Button>
        </div>
        {error && <FieldError role="alert">{error}</FieldError>}
      </div>

      <div className="flex flex-col gap-1">
        <Collapsible defaultOpen>
          <CollapsibleRow>What does approving do?</CollapsibleRow>
          <CollapsibleContent>
            <p className="py-2 ps-7 type-body-sm text-text-2">
              It gives {request.clientName} a token of its own, so it can upload your Claude Code
              sessions. Each session becomes up to 5 decision cards to explain back. Then go back to
              your terminal: it signs in by itself, and the computer shows up under Connected
              devices on Setup.
            </p>
          </CollapsibleContent>
        </Collapsible>
        <Collapsible>
          <CollapsibleRow>Why a code and not a token?</CollapsibleRow>
          <CollapsibleContent>
            <p className="py-2 ps-7 type-body-sm text-text-2">
              A pasted token ends up in shell history and chat logs. This code works once and
              expires after 10 minutes.
            </p>
          </CollapsibleContent>
        </Collapsible>
        <Collapsible>
          <CollapsibleRow>Didn&apos;t run session-coach login?</CollapsibleRow>
          <CollapsibleContent>
            <p className="py-2 ps-7 type-body-sm text-text-2">
              Deny it. Nothing is signed in, and nothing else is needed.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </>
  );
}

/** The page title for every state but the question itself, which brings its own h1. */
export function ApproveHeader() {
  return (
    <AppPageHeader
      title="Connect the CLI"
      description="Check the code matches the one in your terminal, then approve."
    />
  );
}
