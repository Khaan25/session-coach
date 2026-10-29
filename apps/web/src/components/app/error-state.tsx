import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyCode,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyStatus,
  EmptyTitle,
} from "@/components/ui/empty";

type ErrorStateProps = {
  title: React.ReactNode;
  /** What happened and what to do next, safe to show: never a stack trace or a database error. */
  message?: React.ReactNode;
  /** The status word, so the state never rests on the hue: "Failed", "Not found". */
  statusWord?: string;
  /** fail (default) for errors; warn for a 4xx such as not found. */
  status?: "fail" | "warn";
  /** A request ID or status code to quote to support. */
  code?: React.ReactNode;
  /** Retry or the way out. A Button with onClick from a client component, or a Link. */
  action?: React.ReactNode;
  /** Support and details: a link to /support, a disclosure. */
  children?: React.ReactNode;
  /** role="alert": only for an error that appears after the person acted, not for a page that loaded failed. */
  announce?: boolean;
  variant?: "framed" | "plain";
};

/** A region that failed: the status word, a title naming what failed, the safe message, then retry and support. */
export function ErrorState({
  title,
  message,
  statusWord = "Failed",
  status = "fail",
  code,
  action,
  children,
  announce = false,
  variant,
}: ErrorStateProps) {
  return (
    <Empty reason="error" status={status} variant={variant} role={announce ? "alert" : "none"}>
      <EmptyStatus>{statusWord}</EmptyStatus>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        {message && <EmptyDescription>{message}</EmptyDescription>}
      </EmptyHeader>
      {code && <EmptyCode>{code}</EmptyCode>}
      {(action || children) && (
        <EmptyContent>
          {action}
          {children}
        </EmptyContent>
      )}
    </Empty>
  );
}

type PresetProps = Pick<ErrorStateProps, "action" | "announce" | "variant" | "children">;

/**
 * A session whose pipeline failed (`sessions.status = 'failed'`). `error` is the learner-readable message the
 * pipeline stored; it is already safe to show.
 */
export function SessionFailedState({ error, ...props }: PresetProps & { error: string | null }) {
  return (
    <ErrorState
      {...props}
      title="Couldn't make cards from this session"
      // TODO(zia): the next step for a learner when the pipeline stored no error (a re-upload returns 409).
      message={error ?? "Something went wrong while reading this session."}
    />
  );
}

/** A screen's data failed to load. Pass a retry in `action`. */
export function LoadFailedState({
  noun = "this page",
  code,
  ...props
}: PresetProps & { noun?: string; code?: React.ReactNode }) {
  return (
    <ErrorState
      {...props}
      code={code}
      title={`Couldn't load ${noun}`}
      message={`Check your connection and try again. If it keeps failing, contact support${code ? " with the code below" : ""}.`}
    />
  );
}

/** A row that doesn't exist or isn't the learner's (RLS returns no row, so the two look the same). */
export function NotFoundState({
  noun = "Session",
  action,
  ...props
}: PresetProps & { noun?: string }) {
  return (
    <ErrorState
      {...props}
      status="warn"
      statusWord="Not found"
      title={`${noun} not found`}
      message="It may have been deleted, or it belongs to another account."
      action={
        action ?? (
          <Link href="/dashboard" className={buttonVariants({ variant: "secondary" })}>
            Back to the dashboard
          </Link>
        )
      }
    />
  );
}
