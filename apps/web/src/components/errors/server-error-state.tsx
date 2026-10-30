"use client";

import Link from "next/link";
import { useEffect } from "react";

import { ErrorState } from "@/components/app/error-state";
import { Button, buttonVariants } from "@/components/ui/button";

/** The digest Next attaches to a server error, to match the server logs. Never the message or the stack. */
function digestOf(error: unknown) {
  return error instanceof Error && "digest" in error && typeof error.digest === "string"
    ? error.digest
    : undefined;
}

/**
 * What an error boundary shows: what happened, Try again (Next's `retry`), a way out, and the digest as a reference
 * code for support. The thrown message is logged, never shown.
 */
export function ServerErrorState({
  error,
  retry,
  home,
}: {
  error: unknown;
  retry: () => void;
  home: { href: string; label: string };
}) {
  useEffect(() => {
    // TODO(zia): send to an error reporting service once one is chosen.
    console.error(error);
  }, [error]);

  const digest = digestOf(error);
  return (
    <ErrorState
      statusWord="Error"
      title={<h1>Something went wrong on our side</h1>}
      message={`This page didn't load. Try again; if it keeps failing, contact support${digest ? " and quote the code below" : ""}.`}
      code={digest && `Ref ${digest}`}
      action={
        <>
          <Button onClick={() => retry()}>Try again</Button>
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
