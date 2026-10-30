"use client";

import Link from "next/link";
import { useActionState, useId, useRef, useState } from "react";

import { type AuthState, updatePassword } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

// The dashboard minimum (docs/plans/auth.md #23).
const MIN_PASSWORD = 10;

function validate(password: string): string | undefined {
  if (!password) return "Enter a new password.";
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
}

/**
 * Sets a new password for the learner the reset link signed in, through the updatePassword Server Action, then goes
 * to the dashboard.
 */
export function UpdatePasswordForm() {
  const id = useId();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePassword, {});
  // Set when the browser-side check fails; cleared when a submit goes through, so the server's answer shows.
  const [clientError, setClientError] = useState<string>();
  const error = clientError ?? state.fields?.password;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const found = validate(passwordRef.current?.value ?? "");
    setClientError(found);
    if (!found) return;
    event.preventDefault();
    passwordRef.current?.focus();
  }

  const describedBy = `${id}-password-hint${error ? ` ${id}-password-error` : ""}`;

  return (
    <div className="flex flex-col gap-4">
      <Card size="lg">
        <CardContent>
          <form noValidate action={action} onSubmit={handleSubmit}>
            <FieldGroup>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor={`${id}-password`}>New password</FieldLabel>
                <Input
                  ref={passwordRef}
                  id={`${id}-password`}
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={describedBy}
                />
                <FieldDescription id={`${id}-password-hint`}>
                  At least {MIN_PASSWORD} characters.
                </FieldDescription>
                <FieldError id={`${id}-password-error`}>{error}</FieldError>
              </Field>
              <Button type="submit" size="lg" disabled={pending}>
                Save password
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {/* A live region that exists before it has content, so the notice is read out when it appears. */}
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
      <div role="status">
        {!clientError && state.status === "error" && state.message && (
          <AuthNotice title="Couldn't save the password" fail>
            {state.message}
          </AuthNotice>
        )}
      </div>

      <p className="type-body-sm text-text-2">
        Link expired?{" "}
        <Link href="/forgot-password" className={buttonVariants({ variant: "link" })}>
          Request a new one
        </Link>
      </p>
    </div>
  );
}
