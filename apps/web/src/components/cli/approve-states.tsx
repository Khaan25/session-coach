import { useId } from "react";

import { ErrorState } from "@/components/app/error-state";
import { EmptyState } from "@/components/app/empty-state";
import { ApproveHeader } from "@/components/cli/approve-header";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

// /cli/approve's answers other than the pending question (approve-request.tsx): the code form, and one notice that says
// what happened and what to do. The page renders them inside the auth card ((standalone)/layout.tsx).

/** The code form: a plain GET back to the page, so it works before any JavaScript loads. */
export function ApproveCodeForm({ code, error }: { code?: string; error?: string }) {
  const id = useId();
  return (
    <>
      <ApproveHeader />
      <form action="/cli/approve" className="flex flex-col gap-4">
        <h2 className="type-label text-text-1">Enter the code from your terminal</h2>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor={id}>Code</FieldLabel>
          <Input
            id={id}
            name="code"
            defaultValue={code}
            placeholder="XXXX-XXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={9}
            aria-invalid={error ? true : undefined}
            required
          />
          <FieldDescription>
            {error ?? "session-coach login prints it, like WDJB-MJHT."}
          </FieldDescription>
        </Field>
        <Button type="submit">Continue</Button>
      </form>
    </>
  );
}

/** A code that can't be approved: the state's word, what happened and what to do. `action` is a way out, if any. */
export function ApproveNotice({
  word,
  title,
  message,
  action,
}: {
  /** The status word, for a warning; leave it out for a failure. */
  word?: string;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <>
      <ApproveHeader />
      <ErrorState
        variant="plain"
        {...(word ? { status: "warn" as const, statusWord: word } : {})}
        title={title}
        message={message}
        action={action}
      />
    </>
  );
}

/** What the page says once the learner answered: connected, or denied. */
export function ApproveDone({
  done,
  clientName,
}: {
  done: "approved" | "denied";
  clientName: string;
}) {
  return (
    <>
      <ApproveHeader />
      {done === "approved" ? (
        <EmptyState
          variant="plain"
          title="CLI connected"
          description={`Go back to your terminal. ${clientName} signs in within a few seconds, and it shows up under Connected devices on Setup.`}
        />
      ) : (
        <EmptyState
          variant="plain"
          title="Login denied"
          description="That computer wasn't signed in. If you didn't run session-coach login yourself, nothing else is needed."
        />
      )}
    </>
  );
}

/** The copy for each settled code state, by `codeState`. */
export const SETTLED_COPY = {
  expired: {
    word: "Expired",
    title: "This code expired",
    message: "Run session-coach login again for a new one.",
  },
  approved: {
    word: "Approved",
    title: "Already approved",
    message: "Go back to your terminal; it signs in on its next check.",
  },
  used: {
    word: "Used",
    title: "Already used",
    message:
      "That login already has its token. Run session-coach login again to connect another computer.",
  },
  denied: {
    word: "Denied",
    title: "This login was denied",
    message: "Run session-coach login again if you meant to connect.",
  },
} as const;
