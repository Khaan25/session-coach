"use client";

import { useEffect, useState } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  /** Seconds left when the server rendered, so the first paint needs no clock. */
  secondsLeft: number;
  expiresAt: string;
};

/** Seconds until `expiresAt`, ticking once a second from the server's count. */
function useSecondsLeft(expiresAt: string, initial: number): number {
  const [left, setLeft] = useState(initial);
  useEffect(() => {
    const id = setInterval(
      () => setLeft(Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [expiresAt]);
  return left;
}

/** m:ss. */
function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * One pending CLI login: what asked, from where and when, with Approve and Deny. Nothing happens until a click, so a
 * link someone else sent can't sign their computer in to this account.
 */
export function ApproveRequest({ request }: { request: Request }) {
  const secondsLeft = useSecondsLeft(request.expiresAt, request.secondsLeft);
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
      <Card>
        <EmptyState
          variant="plain"
          title="CLI connected"
          description={`Go back to your terminal. ${request.clientName} signs in within a few seconds, and it shows up under Connected devices on Setup.`}
        />
      </Card>
    );
  }
  if (done === "denied") {
    return (
      <Card>
        <EmptyState
          variant="plain"
          title="Login denied"
          description="That computer wasn't signed in. If you didn't run session-coach login yourself, nothing else is needed."
        />
      </Card>
    );
  }
  if (secondsLeft <= 0) {
    return (
      <Card>
        <ErrorState
          variant="plain"
          status="warn"
          statusWord="Expired"
          title="This code expired"
          message="Run session-coach login again for a new one."
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Approve this CLI login?</h2>
        </CardTitle>
        <CardDescription>
          Only approve if you just ran session-coach login on this computer and the code below
          matches your terminal. Approving lets that computer upload sessions to your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
        {error && <FieldError role="alert">{error}</FieldError>}
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => void decide("approve")}
          disabled={pending !== null}
          aria-busy={pending === "approve"}
        >
          {pending === "approve" && <Spinner label="" />}
          Approve
        </Button>
        <Button
          variant="secondary"
          onClick={() => void decide("deny")}
          disabled={pending !== null}
          aria-busy={pending === "deny"}
        >
          {pending === "deny" && <Spinner label="" />}
          Deny
        </Button>
      </CardFooter>
    </Card>
  );
}
