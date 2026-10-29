"use client";

import Link from "next/link";
import { useId } from "react";

import { updatePassword } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { useAuthForm } from "@/components/auth/use-auth-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  return (
    <div className="flex flex-col gap-4">
      <Card size="lg">
        <CardContent>
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
                />
                <FieldDescription id={`${id}-password-hint`}>
                  At least {MIN_PASSWORD} characters.
                </FieldDescription>
                <FieldError id={`${id}-password-error`}>{error}</FieldError>
              </Field>
              <Button type="submit" size="lg" disabled={pending}>
                Save password
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {/* A live region that exists before it has content, so the notice is read out when it appears. */}
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
      <div role="status">
        {result?.status === "error" && result.message && (
          <AuthNotice title="Couldn't save the password" fail>
            {result.message}
          </AuthNotice>
        )}
      </div>

      <p className="type-body-sm text-text-2">
        Link expired?{" "}
        <Link href="/forgot-password" className={buttonVariants({ variant: "link" })}>
          Request a new one
        </Link>
      </p>
    </div>
  );
}
