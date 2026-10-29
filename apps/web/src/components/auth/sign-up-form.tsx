"use client";

import Link from "next/link";
import { useActionState, useId, useRef, useState } from "react";

import { type AuthState, signUp } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { GoogleForm } from "@/components/auth/google-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Errors = { email?: string; password?: string };

// The dashboard minimum (docs/plans/auth.md #23). Character rules come back from Supabase as WeakPasswordError reasons.
const MIN_PASSWORD = 10;

function validate(email: string, password: string): Errors {
  const errors: Errors = {};
  if (!email) errors.email = "Enter your email address.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Enter an email address like name@example.com.";
  if (!password) errors.password = "Enter a password.";
  else if (password.length < MIN_PASSWORD)
    errors.password = `Use at least ${MIN_PASSWORD} characters.`;
  return errors;
}

/**
 * The sign-up form (docs/plans/auth.md): the signUp Server Action, then "check your email" whether or not the address
 * already has an account (#3). Only problems with the password or the rate limit come back to this form.
 */
export function SignUpForm() {
  const id = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});
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

  const passwordDescribedBy = `${id}-password-hint${errors.password ? ` ${id}-password-error` : ""}`;

  return (
    <div className="flex flex-col gap-4">
      <Card size="lg">
        <CardContent>
          <FieldGroup>
            <GoogleForm />
            <FieldSeparator>or</FieldSeparator>
            <form noValidate action={action} onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={`${id}-name`}>Name (optional)</FieldLabel>
                  <Input
                    id={`${id}-name`}
                    name="name"
                    type="text"
                    autoComplete="name"
                    maxLength={100}
                  />
                </Field>
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
                  <FieldLabel htmlFor={`${id}-password`}>Password</FieldLabel>
                  <Input
                    ref={passwordRef}
                    id={`${id}-password`}
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={errors.password ? true : undefined}
                    aria-describedby={passwordDescribedBy}
                  />
                  <FieldDescription id={`${id}-password-hint`}>
                    At least {MIN_PASSWORD} characters.
                  </FieldDescription>
                  <FieldError id={`${id}-password-error`}>{errors.password}</FieldError>
                </Field>
                <Button type="submit" size="lg" disabled={pending}>
                  Create account
                </Button>
              </FieldGroup>
            </form>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* A live region that exists before it has content, so the notice is read out when it appears. */}
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
      <div role="status">
        {!clientErrors && state.status === "error" && state.message && (
          <AuthNotice title="Couldn't create the account" fail>
            {state.message}
          </AuthNotice>
        )}
      </div>

      <p className="type-body-sm text-text-2">
        Already have an account?{" "}
        <Link href="/login" className={buttonVariants({ variant: "link" })}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
