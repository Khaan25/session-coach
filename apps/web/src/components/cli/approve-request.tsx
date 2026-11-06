"use client";

import { LaptopIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { useDryRun } from "@/components/app/dry-run";
import { ApproveDone, ApproveNotice, SETTLED_COPY } from "@/components/cli/approve-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleRow } from "@/components/ui/collapsible";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";

export type ApproveRequestData = {
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
 * One pending CLI login as option C draws it (canvas: "CLI approve · C · One question"): the code huge, what asked and
 * when, two answers, and every explanation folded below. Nothing happens until a click, so a link someone else sent
 * can't sign their computer in to this account. Under DryRunContext (/canvas) the answer shows without the route.
 */
export function ApproveRequest({ request }: { request: ApproveRequestData }) {
  const secondsLeft = useSecondsLeft(request.secondsLeft);
  const dryRun = useDryRun();
  const [pending, setPending] = useState<"approve" | "deny" | null>(null);
  const [done, setDone] = useState<"approved" | "denied" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approve" | "deny") {
    if (dryRun) return setDone(decision === "approve" ? "approved" : "denied");
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

  if (done) return <ApproveDone done={done} clientName={request.clientName} />;
  if (secondsLeft <= 0) return <ApproveNotice {...SETTLED_COPY.expired} />;

  return (
    <>
      <Card>
        <CardContent>
          <section
            aria-labelledby="approve-title"
            className="flex flex-col items-center gap-4 text-center"
          >
            <LaptopIcon weight="duotone" className="size-8 text-text-2" aria-hidden="true" />
            <h1 id="approve-title" className="type-heading-lg text-pretty text-text-1">
              Is this the code in your terminal?
            </h1>
            {/* Mono, so 0 and O, 1 and I read apart when matching the terminal. */}
            <p className="type-code-display text-text-1">{request.userCode}</p>
            {/* Where it came from stays on the page: an address you don't know is a reason to deny. */}
            <p className="type-body-sm text-text-2">
              {request.clientName}
              {request.requestedIp && ` · from ${request.requestedIp}`} · requested{" "}
              {request.requestedAgo} · expires in{" "}
              <span className="tabular-nums">{clock(secondsLeft)}</span>
            </p>
            <div className="grid w-full grid-cols-2 gap-3">
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
          </section>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-1">
        <Collapsible defaultOpen>
          <CollapsibleRow>What does approving do?</CollapsibleRow>
          <CollapsibleContent>
            <p className="py-2 ps-7 type-body-sm text-text-2">
              It gives that computer a token of its own, so it can upload your Claude Code sessions.
              Each session becomes up to 5 decision cards to explain back. Then go back to your
              terminal: it signs in by itself.
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
