import { useId } from "react";

import { ErrorState } from "@/components/app/error-state";
import { EmptyState } from "@/components/app/empty-state";
import { ApproveHeader } from "@/components/cli/approve-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

// /cli/approve's answers other than the pending question (approve-request.tsx): the code form, and one card that says
// what happened and what to do. Shared by the page and /canvas.

/** One narrow column, centred: the page asks a single question. */
export function ApproveColumn({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-(--gutter-sm) py-16 sm:px-(--gutter)">
      {children}
    </div>
  );
}

/** The code form: a plain GET back to the page, so it works before any JavaScript loads. */
export function ApproveCodeForm({ code, error }: { code?: string; error?: string }) {
  const id = useId();
  return (
    <>
      <ApproveHeader />
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Enter the code from your terminal</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action="/cli/approve" className="flex flex-col gap-4">
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
            <div>
              <Button type="submit">Continue</Button>
            </div>
          </form>
        </CardContent>
      </Card>
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
      <Card>
        <ErrorState
          variant="plain"
          {...(word ? { status: "warn" as const, statusWord: word } : {})}
          title={title}
          message={message}
          action={action}
        />
      </Card>
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
      <Card>
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
      </Card>
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
