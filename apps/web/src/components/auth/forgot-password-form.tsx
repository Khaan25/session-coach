"use client";

import { useId } from "react";

import { requestReset } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { AuthCard, AuthStatus, AuthSwitch } from "@/components/auth/auth-parts";
import { GoogleForm } from "@/components/auth/google-form";
import { useAuthForm } from "@/components/auth/use-auth-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { validateResetRequest } from "@/lib/auth/validate";

/**
 * The reset request (docs/plans/auth.md): the requestReset Server Action, then the same notice for every address, so
 * the page never says whether an account exists (#4). Google-only accounts can sign in with Google instead (#16).
 */
export function ForgotPasswordForm() {
  const id = useId();
  const { action, handleSubmit, pending, errors, result, email } = useAuthForm(
    requestReset,
    validateResetRequest,
  );
  const error = errors.email;

  return (
    <div className="flex flex-col gap-4">
      <AuthCard>
        <FieldGroup>
          <form noValidate action={action} onSubmit={handleSubmit}>
            <FieldGroup>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor={`${id}-email`}>Email</FieldLabel>
                <Input
                  id={`${id}-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  spellCheck={false}
                  defaultValue={email}
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
      </AuthCard>

      <AuthStatus>
        {result?.status === "sent" && (
          <AuthNotice title="Check your email">
            If an account exists for that address, we sent a link to reset the password. Open it on
            this device.
          </AuthNotice>
        )}
        {result?.status === "error" && result.message && (
          <AuthNotice title="Couldn't send the link" fail>
            {result.message}
          </AuthNotice>
        )}
      </AuthStatus>

      <AuthSwitch prompt="Remembered it?" href="/login">
        Sign in
      </AuthSwitch>
    </div>
  );
}
