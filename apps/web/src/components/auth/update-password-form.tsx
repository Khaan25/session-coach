"use client";

import { CheckCircleIcon, CircleIcon } from "@phosphor-icons/react";
import { useId, useState } from "react";

import { updatePassword } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { AuthCard, AuthStatus, AuthSwitch } from "@/components/auth/auth-parts";
import { useAuthForm } from "@/components/auth/use-auth-form";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MIN_PASSWORD, validateNewPassword } from "@/lib/auth/validate";

/**
 * Sets a new password for the learner the reset link signed in, through the updatePassword Server Action, then goes
 * to the dashboard.
 */
export function UpdatePasswordForm() {
  const id = useId();
  const { action, handleSubmit, pending, errors, result } = useAuthForm(
    updatePassword,
    validateNewPassword,
  );
  const error = errors.password;

  const describedBy = `${id}-password-hint${error ? ` ${id}-password-error` : ""}`;
  // The length rule, checked as the learner types, so the error never has to come after submit.
  const [length, setLength] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <AuthCard>
        <form noValidate action={action} onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor={`${id}-password`}>New password</FieldLabel>
              <Input
                id={`${id}-password`}
                name="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                onChange={(event) => setLength(event.target.value.length)}
              />
              <FieldDescription id={`${id}-password-hint`}>
                <span className="inline-flex items-center gap-1.5">
                  {length >= MIN_PASSWORD ? (
                    <CheckCircleIcon weight="fill" aria-hidden />
                  ) : (
                    <CircleIcon aria-hidden />
                  )}
                  At least {MIN_PASSWORD} characters{length ? ` (${length} so far)` : ""}.
                </span>
              </FieldDescription>
              <FieldError id={`${id}-password-error`}>{error}</FieldError>
            </Field>
            <Button type="submit" size="lg" disabled={pending}>
              Save password
            </Button>
          </FieldGroup>
        </form>
      </AuthCard>

      <AuthStatus>
        {result?.status === "error" && result.message && (
          <AuthNotice title="Couldn't save the password" fail>
            {result.message}
          </AuthNotice>
        )}
      </AuthStatus>

      <AuthSwitch prompt="Link expired?" href="/forgot-password">
        Request a new one
      </AuthSwitch>
    </div>
  );
}
