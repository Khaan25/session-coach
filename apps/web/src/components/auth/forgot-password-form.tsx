"use client";

import { GoogleLogoIcon, InfoIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useId, useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";

function validate(email: string): string | undefined {
  if (!email) return "Enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return "Enter an email address like name@example.com.";
}

/**
 * The reset request from docs/plans/auth.md, as a UI mock: it validates, then shows the same notice for every address
 * (no account enumeration, #4). Nothing is sent or stored, and there is no form action.
 */
export function ForgotPasswordForm() {
  const id = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<"reset" | "google">();

  // TODO(zia): call the requestReset Server Action (auth.resetPasswordForEmail, redirectTo
  // <origin>/auth/confirm?next=/update-password). Show the same notice whatever it returns.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = validate(emailRef.current?.value.trim() ?? "");
    setError(next);
    if (next) emailRef.current?.focus();
    setNotice(next ? undefined : "reset");
  }

  // Google-only accounts have no password to reset (docs/plans/auth.md #16).
  // TODO(zia): call the signInWithGoogle Server Action (auth.signInWithOAuth, redirectTo from the request origin).
  function handleGoogle() {
    setError(undefined);
    setNotice("google");
  }

  return (
    <div className="flex flex-col gap-4">
      <Card size="lg">
        <CardContent>
          <FieldGroup>
            <form noValidate onSubmit={handleSubmit}>
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
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${id}-email-error` : undefined}
                  />
                  <FieldError id={`${id}-email-error`}>{error}</FieldError>
                </Field>
                <Button type="submit" size="lg">
                  Send reset link
                </Button>
              </FieldGroup>
            </form>
            <FieldSeparator>or, if you signed up with Google</FieldSeparator>
            <Button type="button" variant="secondary" size="lg" onClick={handleGoogle}>
              <GoogleLogoIcon weight="bold" data-icon="inline-start" aria-hidden />
              Continue with Google
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* A live region that exists before it has content, so the notice is read out when it appears. */}
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
      <div role="status">
        {notice && (
          <Item variant="outline">
            <ItemMedia variant="icon">
              <InfoIcon weight="duotone" aria-hidden />
            </ItemMedia>
            <ItemContent>
              {notice === "reset" ? (
                <>
                  <ItemTitle>Check your email</ItemTitle>
                  <ItemDescription>
                    If an account exists for that address, we sent a link to reset the password.
                    Accounts arrive with the next release, so nothing was sent yet.
                  </ItemDescription>
                </>
              ) : (
                <>
                  <ItemTitle>Sign-in isn&apos;t open yet</ItemTitle>
                  <ItemDescription>
                    Accounts arrive with the next release. Nothing you typed was sent or saved.
                  </ItemDescription>
                </>
              )}
            </ItemContent>
          </Item>
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
