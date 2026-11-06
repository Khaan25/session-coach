"use client";

import Link from "next/link";
import { useEffect } from "react";

import { useDryRun } from "@/components/app/dry-run";
import { Button, buttonVariants } from "@/components/ui/button";

/** The digest Next attaches to a server error, to match the server logs. Never the message or the stack. */
function digestOf(error: unknown) {
  return error instanceof Error && "digest" in error && typeof error.digest === "string"
    ? error.digest
    : undefined;
}

/**
 * What an error boundary shows: a large heading, what to do, Try again (Next's `retry`), and quieter ways out. The
 * digest is the reference code for support. The thrown message is logged, never shown.
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
  // /canvas draws this with a synthetic error: nothing to log.
  const dryRun = useDryRun();
  useEffect(() => {
    // TODO(zia): send to an error reporting service once one is chosen.
    if (!dryRun) console.error(error);
  }, [error, dryRun]);

  const digest = digestOf(error);
  return (
    <div className="flex flex-col items-start gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="type-display-lg text-balance text-text-1">
          Something went wrong on our side
        </h1>
        <p className="type-body-lg text-pretty text-text-2">
          This page didn&apos;t load. Try again; if it keeps failing, contact support
          {digest ? " and quote the code below" : ""}.
        </p>
        {digest && <p className="type-code-sm text-text-3">Ref {digest}</p>}
      </div>
      <Button size="lg" onClick={() => retry()}>
        Try again
      </Button>
      <p className="type-body-sm text-text-2">
        <Link href={home.href} className={buttonVariants({ variant: "link" })}>
          {home.label}
        </Link>{" "}
        or{" "}
        <Link href="/support" className={buttonVariants({ variant: "link" })}>
          contact support
        </Link>
      </p>
    </div>
  );
}
