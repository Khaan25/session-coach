"use client";

import Link from "next/link";
import { useId } from "react";

import { signIn } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { AuthCard, AuthStatus, AuthSwitch } from "@/components/auth/auth-parts";
import { GoogleForm } from "@/components/auth/google-form";
import { ResendConfirmation } from "@/components/auth/resend-confirmation";
import { useAuthForm } from "@/components/auth/use-auth-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { validateSignIn } from "@/lib/auth/validate";

/**
 * The sign-in form (docs/plans/auth.md): email and password through the signIn Server Action, or Google. The fields
 * are checked here first; the server checks them again and answers bad credentials with one generic message.
 *
 * @param next - Where to go after signing in; the server keeps it only when it stays on this origin.
 */
export function LoginForm({ next }: { next?: string }) {
  const id = useId();
  const { action, handleSubmit, pending, errors, result, email } = useAuthForm(
    signIn,
    validateSignIn,
  );

  return (
    <div className="flex flex-col gap-4">
      <AuthCard>
        <FieldGroup>
          <GoogleForm next={next} />
          <FieldSeparator>or</FieldSeparator>
          <form noValidate action={action} onSubmit={handleSubmit}>
            <input type="hidden" name="next" value={next ?? ""} />
            <FieldGroup>
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
                <div className="flex items-baseline justify-between gap-3">
                  <FieldLabel htmlFor={`${id}-password`}>Password</FieldLabel>
                  <Link href="/forgot-password" className={buttonVariants({ variant: "link" })}>
                    Forgot password?
                  </Link>
                </div>
                <Input
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
      </AuthCard>

      <AuthStatus>
        {result?.status === "unconfirmed" && (
          <AuthNotice title="Confirm your email">{result.message}</AuthNotice>
        )}
        {result?.status === "error" && result.message && (
          <AuthNotice title="Couldn't sign in" fail>
            {result.message}
          </AuthNotice>
        )}
      </AuthStatus>
      {/* Outside the live region: it has its own, for the resend answer. Keyed by address so another address starts fresh. */}
      {result?.status === "unconfirmed" && result.email && (
        <ResendConfirmation key={result.email} email={result.email} />
      )}

      <AuthSwitch prompt="New to Session Coach?" href="/sign-up">
        Create an account
      </AuthSwitch>
    </div>
  );
}
