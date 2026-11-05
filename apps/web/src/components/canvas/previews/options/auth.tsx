"use client";

// The picked auth design, option B over the existing art: the real auth screens. Each is the real AuthShell (through
// AuthFrame), the route's real heading and form, and the art panel the route picks. A state the server would answer
// with (a field error, a notice) comes in through AuthPreviewContext; the frame's DryRunContext keeps every form from
// calling its Server Action.

import type { AuthState } from "@/app/(auth)/actions";
import { AuthCard, AuthSwitch } from "@/components/auth/auth-parts";
import {
  AuthErrorActions,
  AuthErrorHeading,
  AuthErrorNotice,
  CheckEmailHeading,
  ConfirmHeading,
  ForgotPasswordHeading,
  LoginHeading,
  SignUpHeading,
  UpdatePasswordHeading,
  type AuthErrorCode,
} from "@/components/auth/auth-screens";
import { ConfirmButton } from "@/components/auth/confirm-button";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { LoginForm } from "@/components/auth/login-form";
import { ResendConfirmation } from "@/components/auth/resend-confirmation";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { AuthPreviewContext } from "@/components/auth/use-auth-form";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

import { AuthFrame } from "../frames";

/** The server's answer to draw, as the form's Server Action would return it. */
type Preview = { state?: AuthState };

function Answer({ state, children }: Preview & { children: React.ReactNode }) {
  return <AuthPreviewContext value={state ?? null}>{children}</AuthPreviewContext>;
}

export function AuthLoginOptionB({ state }: Preview = {}) {
  return (
    <AuthFrame path="/login" scene="sign-in">
      <LoginHeading />
      <Answer state={state}>
        <LoginForm />
      </Answer>
    </AuthFrame>
  );
}

export function AuthSignUpOptionB({ state }: Preview = {}) {
  return (
    <AuthFrame path="/sign-up" scene="sign-up">
      <SignUpHeading />
      <Answer state={state}>
        <SignUpForm />
      </Answer>
    </AuthFrame>
  );
}

/** `resent`: after "Resend the email", with the answer the resend action gives. */
export function AuthCheckEmailOptionB({ resent }: { resent?: boolean } = {}) {
  return (
    <AuthFrame path="/sign-up/check-email" scene="email">
      <CheckEmailHeading />
      <Answer
        state={
          resent
            ? {
                status: "sent",
                message: "If that address is waiting to be confirmed, we sent a new link.",
              }
            : undefined
        }
      >
        <ResendConfirmation email="sam@example.com" />
      </Answer>
      <AuthSwitch prompt="Already confirmed?" href="/login">
        Sign in
      </AuthSwitch>
    </AuthFrame>
  );
}

export function AuthForgotPasswordOptionB({ state }: Preview = {}) {
  return (
    <AuthFrame path="/forgot-password" scene="password">
      <ForgotPasswordHeading />
      <Answer state={state}>
        <ForgotPasswordForm />
      </Answer>
    </AuthFrame>
  );
}

export function AuthUpdatePasswordOptionB({ state }: Preview = {}) {
  return (
    <AuthFrame path="/update-password" scene="new-password">
      <UpdatePasswordHeading />
      <Answer state={state}>
        <UpdatePasswordForm />
      </Answer>
    </AuthFrame>
  );
}

export function AuthErrorOptionB({ code = "link_expired" }: { code?: AuthErrorCode } = {}) {
  return (
    <AuthFrame path={`/auth/error?code=${code}`} scene="error">
      <AuthErrorHeading />
      <AuthErrorNotice code={code} />
      <AuthErrorActions />
    </AuthFrame>
  );
}

/** /auth/confirm: the page an email link opens. A button, not a GET handler, so link scanners can't spend the token. */
export function AuthConfirm({ state }: { state: "sign-up" | "recovery" | "incomplete" }) {
  return (
    <AuthFrame
      path={
        state === "incomplete"
          ? "/auth/confirm?type=signup"
          : `/auth/confirm?token_hash=…&type=${state === "recovery" ? "recovery" : "signup"}`
      }
      scene="email"
    >
      <ConfirmHeading />
      {state === "incomplete" ? (
        <AuthErrorNotice code="invalid_link" />
      ) : (
        <AuthCard>
          {/* No action: on the canvas the button confirms nothing. */}
          <form className="flex flex-col" onSubmit={(event) => event.preventDefault()}>
            <ConfirmButton>
              {state === "recovery" ? "Continue to set a password" : "Confirm and sign in"}
            </ConfirmButton>
          </form>
        </AuthCard>
      )}
      <AuthSwitch prompt="Didn't ask for this?" href="/">
        Go home
      </AuthSwitch>
    </AuthFrame>
  );
}
