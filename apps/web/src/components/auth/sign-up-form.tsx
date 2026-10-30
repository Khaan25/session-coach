"use client";

import { GoogleLogoIcon, InfoIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

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
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";

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
 * The sign-up form from docs/plans/auth.md, as a UI mock: it validates, then moves to "check your email". Nothing is
 * sent or stored, and there is no form action, so the browser never posts the fields anywhere.
 */
export function SignUpForm() {
  const id = useId();
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState(false);

  // TODO(zia): call the signUp Server Action (auth.signUp, emailRedirectTo <origin>/auth/confirm?next=/dashboard,
  // data.full_name from the name field, or null when blank). Land on "check your email" whatever it returns (#3).
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = emailRef.current?.value.trim() ?? "";
    const password = passwordRef.current?.value ?? "";
    const next = validate(email, password);
    setErrors(next);
    setNotice(false);
    if (next.email) emailRef.current?.focus();
    else if (next.password) passwordRef.current?.focus();
    // A page change, not a request: nothing typed goes with it.
    else router.push("/sign-up/check-email");
  }

  // TODO(zia): call the signInWithGoogle Server Action (auth.signInWithOAuth, redirectTo from the request origin).
  function handleGoogle() {
    setErrors({});
    setNotice(true);
  }

  const passwordDescribedBy = `${id}-password-hint${errors.password ? ` ${id}-password-error` : ""}`;

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
                <Field>
                  <FieldLabel htmlFor={`${id}-name`}>Name (optional)</FieldLabel>
                  <Input id={`${id}-name`} name="name" type="text" autoComplete="name" />
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
                <Button type="submit" size="lg">
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
        {notice && (
          <Item variant="outline">
            <ItemMedia variant="icon">
              <InfoIcon weight="duotone" aria-hidden />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Sign-up isn&apos;t open yet</ItemTitle>
              <ItemDescription>
                Accounts arrive with the next release. Nothing you typed was sent or saved.
              </ItemDescription>
            </ItemContent>
          </Item>
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
