"use client";

import { useId } from "react";

import { signUp } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { AuthCard, AuthStatus, AuthSwitch } from "@/components/auth/auth-parts";
import { GoogleForm } from "@/components/auth/google-form";
import { useAuthForm } from "@/components/auth/use-auth-form";
import { Button } from "@/components/ui/button";
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
 * already has an account (#3). Only field errors, the rate limit and unexpected failures come back to this form;
 * a taken address never does.
 */
export function SignUpForm() {
  const id = useId();
  const { action, handleSubmit, pending, errors, result, email, name } = useAuthForm(
    signUp,
    validateSignUp,
  );

  const passwordDescribedBy = `${id}-password-hint${errors.password ? ` ${id}-password-error` : ""}`;

  return (
    <div className="flex flex-col gap-4">
      <AuthCard>
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
                  defaultValue={name}
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
      </AuthCard>

      <AuthStatus>
        {result?.status === "error" && result.message && (
          <AuthNotice title="Couldn't create the account" fail>
            {result.message}
          </AuthNotice>
        )}
      </AuthStatus>

      <AuthSwitch prompt="Already have an account?" href="/login">
        Sign in
      </AuthSwitch>
    </div>
  );
}
