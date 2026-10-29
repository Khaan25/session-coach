"use server";

import { isAuthWeakPasswordError, type AuthError } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { safeNext } from "@/lib/auth/safe-next";
import { EMAIL, MIN_PASSWORD } from "@/lib/auth/validate";
import { SIGNUP_EMAIL_COOKIE } from "@/lib/auth/signup-email";
import { createClient } from "@/lib/supabase/server";

/** What a form shows after its action runs. Field errors sit under the field; `message` sits under the form. */
export type AuthState = {
  status?: "error" | "sent" | "unconfirmed";
  message?: string;
  fields?: { email?: string; password?: string };
  /** The address typed, so the form can keep it after React resets the fields. Never the password. */
  email?: string;
};

const GENERIC = "Something went wrong on our side. Try again in a minute.";
const RATE_LIMITED = "Too many attempts. Wait a minute, then try again.";

/**
 * This deployment's origin for email and OAuth redirect URLs. Next.js only runs a Server Action when its `Origin`
 * header matches the request host (its CSRF check), so it names this deployment, preview or production, and can't be
 * pointed elsewhere the way `x-forwarded-host` alone could (docs/plans/auth.md #10, #13).
 */
async function requestOrigin() {
  return (await headers()).get("origin");
}

/** A form field as a string; a missing field or a file reads as "". */
function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** The field error for an email address, or undefined when it looks like one. */
function checkEmail(email: string) {
  if (!email) return "Enter your email address.";
  if (!EMAIL.test(email)) return "Enter an email address like name@example.com.";
}

/** Turns Supabase's weak-password reasons into one sentence that says what to change (#23). */
function weakPasswordMessage(error: AuthError) {
  if (!isAuthWeakPasswordError(error)) return `Use at least ${MIN_PASSWORD} characters.`;
  const reasons = new Set(error.reasons);
  if (reasons.has("pwned")) return "This password has appeared in a data breach. Choose another.";
  if (reasons.has("length")) return `Use at least ${MIN_PASSWORD} characters.`;
  return "Mix lowercase and uppercase letters, digits and symbols.";
}

function isRateLimit(error: AuthError) {
  return error.code === "over_request_rate_limit" || error.code === "over_email_send_rate_limit";
}

/** Logs an unexpected error and shows generic copy: raw auth errors can name internals or hint whether an account exists. */
function fail(action: string, error: unknown, email?: string): AuthState {
  console.error(`auth/${action}`, error);
  return { status: "error", message: GENERIC, email };
}

/**
 * Signs in with email and password, then goes to `next` when it stays on this origin. An unconfirmed address gets the
 * "unconfirmed" status, so the form can offer to resend the link (#1).
 *
 * @param _prev - The form's last state (useActionState); unused.
 * @param formData - `email`, `password` and the hidden `next`.
 * @returns The state to show, or no return: it redirects on success.
 */
export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = text(formData, "email").trim();
  const password = text(formData, "password");
  const fields = {
    email: checkEmail(email),
    password: password ? undefined : "Enter your password.",
  };
  if (fields.email || fields.password) return { status: "error", fields, email };

  const origin = await requestOrigin();
  if (!origin) return fail("signIn", "missing Origin header", email);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed")
      return {
        status: "unconfirmed",
        message: "Confirm your email address first. We can send the link again.",
        email,
      };
    if (isRateLimit(error)) return { status: "error", message: RATE_LIMITED, email };
    if (error.code === "invalid_credentials")
      return { status: "error", message: "That email and password don't match.", email };
    return fail("signIn", error, email);
  }
  redirect(safeNext(text(formData, "next"), origin));
}

/**
 * Creates an account and sends the confirmation email, whose link comes back to this deployment's /auth/confirm.
 * Every outcome but a bad input lands on "check your email", so sign-up can't tell anyone which addresses have
 * accounts (#3).
 *
 * @param _prev - The form's last state (useActionState); unused.
 * @param formData - `email`, `password` and the optional `name`.
 * @returns The state to show, or no return: it redirects to /sign-up/check-email.
 */
export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = text(formData, "email").trim();
  const password = text(formData, "password");
  const name = text(formData, "name").trim();
  const fields = {
    email: checkEmail(email),
    password: !password
      ? "Enter a password."
      : password.length < MIN_PASSWORD
        ? `Use at least ${MIN_PASSWORD} characters.`
        : undefined,
  };
  if (fields.email || fields.password) return { status: "error", fields, email };

  const origin = await requestOrigin();
  if (!origin) return fail("signUp", "missing Origin header", email);
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/dashboard`,
      // The trigger treats a missing name as none; never send "" (docs/plans/auth.md #27).
      data: { full_name: name ? name.slice(0, 100) : null },
    },
  });
  // A taken address must look like a new one (#3), so only errors about the input itself reach the form.
  if (error && error.code !== "user_already_exists") {
    if (error.code === "weak_password")
      return { status: "error", fields: { password: weakPasswordMessage(error) }, email };
    if (error.code === "email_address_invalid")
      return {
        status: "error",
        fields: { email: "Enter an email address like name@example.com." },
        email,
      };
    if (isRateLimit(error)) return { status: "error", message: RATE_LIMITED, email };
    return fail("signUp", error, email);
  }

  // The check-email page reads this to offer a resend; a cookie keeps the address out of the URL and server logs.
  (await cookies()).set(SIGNUP_EMAIL_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https:"),
    path: "/sign-up",
    maxAge: 60 * 60,
  });
  redirect("/sign-up/check-email");
}

/**
 * Sends the sign-up confirmation link again. Supabase allows one per address per 60 s; the form adds its own cooldown.
 *
 * @param _prev - The form's last state (useActionState); unused.
 * @param formData - `email`.
 * @returns "sent" with the same message whether or not the address has an account, or a rate-limit error.
 */
export async function resendConfirmation(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = text(formData, "email").trim();
  if (checkEmail(email)) return { status: "error", message: "Enter your email address first." };
  const origin = await requestOrigin();
  if (!origin) return fail("resendConfirmation", "missing Origin header", email);
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=/dashboard` },
  });
  if (error && isRateLimit(error)) return { status: "error", message: RATE_LIMITED, email };
  if (error) console.error("auth/resendConfirmation", error);
  // The same answer whether or not the address has an account (#2).
  return {
    status: "sent",
    message: "If that address is waiting to be confirmed, we sent a new link.",
    email,
  };
}

/**
 * Emails a password reset link. The link goes to /auth/confirm, which signs the learner in and sends them on to
 * /update-password. A Google-only learner can use it to add a password (#16).
 *
 * @param _prev - The form's last state (useActionState); unused.
 * @param formData - `email`.
 * @returns "sent" whether or not the address has an account, or a field or rate-limit error.
 */
export async function requestReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = text(formData, "email").trim();
  const emailError = checkEmail(email);
  if (emailError) return { status: "error", fields: { email: emailError }, email };
  const origin = await requestOrigin();
  if (!origin) return fail("requestReset", "missing Origin header", email);
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/update-password`,
  });
  if (error && isRateLimit(error)) return { status: "error", message: RATE_LIMITED, email };
  if (error) console.error("auth/requestReset", error);
  // The same answer whether or not the address has an account (#4).
  return { status: "sent", email };
}

/**
 * Sets a new password for the learner the reset link signed in. Without a session the link has expired, so the form
 * says to request a new one rather than showing a generic error.
 *
 * @param _prev - The form's last state (useActionState); unused.
 * @param formData - `password`.
 * @returns The state to show, or no return: it redirects to /dashboard.
 */
export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = text(formData, "password");
  if (password.length < MIN_PASSWORD)
    return {
      status: "error",
      fields: {
        password: password ? `Use at least ${MIN_PASSWORD} characters.` : "Enter a new password.",
      },
    };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub)
    return {
      status: "error",
      message: "Your reset link has expired. Request a new one to set a password.",
    };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "weak_password")
      return { status: "error", fields: { password: weakPasswordMessage(error) } };
    if (error.code === "same_password")
      return {
        status: "error",
        fields: { password: "Choose a password different from your current one." },
      };
    if (error.code === "reauthentication_needed" || error.code === "session_not_found")
      return {
        status: "error",
        message: "Your reset link has expired. Request a new one to set a password.",
      };
    if (isRateLimit(error)) return { status: "error", message: RATE_LIMITED };
    return fail("updatePassword", error);
  }
  redirect("/dashboard");
}

/**
 * Starts Google sign-in: Supabase sends the browser to Google, which comes back to /auth/callback on this origin.
 * `next` is checked here and again in the callback, so neither hop can become an open redirect.
 *
 * @param formData - The hidden `next`.
 */
export async function signInWithGoogle(formData: FormData): Promise<void> {
  const origin = await requestOrigin();
  if (!origin) {
    console.error("auth/signInWithGoogle", "missing Origin header");
    redirect("/auth/error?code=oauth_failed");
  }
  const next = safeNext(text(formData, "next"), origin);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) {
    console.error("auth/signInWithGoogle", error);
    redirect("/auth/error?code=oauth_failed");
  }
  redirect(data.url);
}

/** Signs out this browser only. A POST action, never a GET link, so another site can't sign a learner out (#26). */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) console.error("auth/signOut", error);
  redirect("/");
}

/** Signs out every browser and device: revokes all of the learner's refresh tokens. */
export async function signOutEverywhere(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) console.error("auth/signOutEverywhere", error);
  redirect("/");
}
