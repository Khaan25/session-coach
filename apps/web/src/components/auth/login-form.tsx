"use client";

import Link from "next/link";
import { useActionState, useId, useRef, useState } from "react";

import { type AuthState, signIn } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { GoogleForm } from "@/components/auth/google-form";
import { ResendConfirmation } from "@/components/auth/resend-confirmation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Errors = { email?: string; password?: string };

// Sign-in checks presence and shape only. The length and character rules apply on sign-up (docs/plans/auth.md #23).
function validate(email: string, password: string): Errors {
  const errors: Errors = {};
  if (!email) errors.email = "Enter your email address.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Enter an email address like name@example.com.";
  if (!password) errors.password = "Enter your password.";
  return errors;
}

/**
 * The sign-in form (docs/plans/auth.md): email and password through the signIn Server Action, or Google. The fields
 * are checked here first; the server checks them again and answers bad credentials with one generic message.
 *
 * @param next - Where to go after signing in; the server keeps it only when it stays on this origin.
 */
export function LoginForm({ next }: { next?: string }) {
  const id = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});
  // Set when the browser-side check fails; cleared when a submit goes through, so the server's answer shows.
  const [clientErrors, setClientErrors] = useState<Errors>();
  const errors = clientErrors ?? state.fields ?? {};

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const email = emailRef.current?.value.trim() ?? "";
    const password = passwordRef.current?.value ?? "";
    const found = validate(email, password);
    if (!found.email && !found.password) return setClientErrors(undefined);
    event.preventDefault();
    setClientErrors(found);
    if (found.email) emailRef.current?.focus();
    else passwordRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      <Card size="lg">
        <CardContent>
          <FieldGroup>
            <GoogleForm next={next} />
            <FieldSeparator>or</FieldSeparator>
            <form noValidate action={action} onSubmit={handleSubmit}>
              <input type="hidden" name="next" value={next ?? ""} />
              <FieldGroup>
                <Field data-invalid={errors.email ? true : undefined}>
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
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={errors.email ? `${id}-email-error` : undefined}
                  />
                  <FieldError id={`${id}-email-error`}>{errors.email}</FieldError>
                </Field>
                <Field data-invalid={errors.password ? true : undefined}>
                  <div className="flex items-baseline justify-between gap-3">
                    <FieldLabel htmlFor={`${id}-password`}>Password</FieldLabel>
                    <Link href="/forgot-password" className={buttonVariants({ variant: "link" })}>
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    ref={passwordRef}
                    id={`${id}-password`}
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={errors.password ? true : undefined}
                    aria-describedby={errors.password ? `${id}-password-error` : undefined}
                  />
                  <FieldError id={`${id}-password-error`}>{errors.password}</FieldError>
                </Field>
                <Button type="submit" size="lg" disabled={pending}>
                  Sign in
                </Button>
              </FieldGroup>
            </form>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* A live region that exists before it has content, so the notice is read out when it appears. A div, not
      <output>: the notice is block content. */}
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
      <div role="status">
        {!clientErrors && state.status === "unconfirmed" && (
          <AuthNotice title="Confirm your email">{state.message}</AuthNotice>
        )}
        {!clientErrors && state.status === "error" && state.message && (
          <AuthNotice title="Couldn't sign in" fail>
            {state.message}
          </AuthNotice>
        )}
      </div>
      {/* Outside the live region: it has its own, for the resend answer. Keyed by address so another address starts fresh. */}
      {!clientErrors && state.status === "unconfirmed" && state.email && (
        <ResendConfirmation key={state.email} email={state.email} />
      )}

      <p className="type-body-sm text-text-2">
        New to Session Coach?{" "}
        <Link href="/sign-up" className={buttonVariants({ variant: "link" })}>
          Create an account
        </Link>
      </p>
    </div>
  );
}
