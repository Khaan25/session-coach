"use client";

import Link from "next/link";
import { useActionState, useId, useRef, useState } from "react";

import { type AuthState, requestReset } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { GoogleForm } from "@/components/auth/google-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

function validate(email: string): string | undefined {
  if (!email) return "Enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return "Enter an email address like name@example.com.";
}

/**
 * The reset request (docs/plans/auth.md): the requestReset Server Action, then the same notice for every address, so
 * the page never says whether an account exists (#4). Google-only accounts can sign in with Google instead (#16).
 */
export function ForgotPasswordForm() {
  const id = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState<AuthState, FormData>(requestReset, {});
  // Set when the browser-side check fails; cleared when a submit goes through, so the server's answer shows.
  const [clientError, setClientError] = useState<string>();
  const error = clientError ?? state.fields?.email;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const found = validate(emailRef.current?.value.trim() ?? "");
    setClientError(found);
    if (!found) return;
    event.preventDefault();
    emailRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      <Card size="lg">
        <CardContent>
          <FieldGroup>
            <form noValidate action={action} onSubmit={handleSubmit}>
              <FieldGroup>
                <Field data-invalid={error ? true : undefined}>
                  <FieldLabel htmlFor={`${id}-email`}>Email</FieldLabel>
                  <Input
                    ref={emailRef}
                    id={`${id}-email`}
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    spellCheck={false}
                    defaultValue={state.email}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${id}-email-error` : undefined}
                  />
                  <FieldError id={`${id}-email-error`}>{error}</FieldError>
                </Field>
                <Button type="submit" size="lg" disabled={pending}>
                  Send reset link
                </Button>
              </FieldGroup>
            </form>
            <FieldSeparator>or, if you signed up with Google</FieldSeparator>
            <GoogleForm />
          </FieldGroup>
        </CardContent>
      </Card>

      {/* A live region that exists before it has content, so the notice is read out when it appears. */}
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
      <div role="status">
        {!clientError && state.status === "sent" && (
          <AuthNotice title="Check your email">
            If an account exists for that address, we sent a link to reset the password. Open it on
            this device.
          </AuthNotice>
        )}
        {!clientError && state.status === "error" && state.message && (
          <AuthNotice title="Couldn't send the link" fail>
            {state.message}
          </AuthNotice>
        )}
      </div>

      <p className="type-body-sm text-text-2">
        Remembered it?{" "}
        <Link href="/login" className={buttonVariants({ variant: "link" })}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
