"use client";

import Link from "next/link";
import { useId } from "react";

import { signUp } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { GoogleForm } from "@/components/auth/google-form";
import { useAuthForm } from "@/components/auth/use-auth-form";
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
import { MIN_PASSWORD, validateSignUp } from "@/lib/auth/validate";

/**
 * The sign-up form (docs/plans/auth.md): the signUp Server Action, then "check your email" whether or not the address
 * already has an account (#3). Only problems with the password or the rate limit come back to this form.
 */
export function SignUpForm() {
  const id = useId();
  const { action, handleSubmit, pending, errors, result, email } = useAuthForm(
    signUp,
    validateSignUp,
  );

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
                    id={`${id}-email`}
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    spellCheck={false}
                    defaultValue={email}
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={errors.email ? `${id}-email-error` : undefined}
                  />
                  <FieldError id={`${id}-email-error`}>{errors.email}</FieldError>
                </Field>
                <Field data-invalid={errors.password ? true : undefined}>
                  <FieldLabel htmlFor={`${id}-password`}>Password</FieldLabel>
                  <Input
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
        {result?.status === "error" && result.message && (
          <AuthNotice title="Couldn't create the account" fail>
            {result.message}
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
