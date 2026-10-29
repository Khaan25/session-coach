"use client";

import { GoogleLogoIcon, InfoIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useId, useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";

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
 * The sign-in form from docs/plans/auth.md, as a UI mock: it validates, then shows a notice. Nothing is sent or stored,
 * and there is no form action, so the browser never posts the fields anywhere.
 */
export function LoginForm() {
  const id = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState(false);

  // TODO(zia): call the signIn Server Action (auth.signInWithPassword). On email_not_confirmed show a resend button
  // with a 60 s cooldown; on bad credentials one generic message. Redirect to safeNext(next).
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = emailRef.current?.value.trim() ?? "";
    const password = passwordRef.current?.value ?? "";
    const next = validate(email, password);
    setErrors(next);
    if (next.email) emailRef.current?.focus();
    else if (next.password) passwordRef.current?.focus();
    setNotice(!next.email && !next.password);
  }

  // TODO(zia): call the signInWithGoogle Server Action (auth.signInWithOAuth, redirectTo from the request origin).
  function handleGoogle() {
    setErrors({});
    setNotice(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card size="lg">
        <CardContent>
          <FieldGroup>
            <Button type="button" variant="secondary" size="lg" onClick={handleGoogle}>
              <GoogleLogoIcon weight="bold" data-icon="inline-start" aria-hidden />
              Continue with Google
            </Button>
            <FieldSeparator>or</FieldSeparator>
            <form noValidate onSubmit={handleSubmit}>
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
                <Button type="submit" size="lg">
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
        {notice && (
          <Item variant="outline">
            <ItemMedia variant="icon">
              <InfoIcon weight="duotone" aria-hidden />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Sign-in isn&apos;t open yet</ItemTitle>
              <ItemDescription>
                Accounts arrive with the next release. Nothing you typed was sent or saved.
              </ItemDescription>
            </ItemContent>
          </Item>
        )}
      </div>

      <p className="type-body-sm text-text-2">
        New to Session Coach?{" "}
        <Link href="/sign-up" className={buttonVariants({ variant: "link" })}>
          Create an account
        </Link>
      </p>
    </div>
  );
}
