// The browser-side checks for the auth forms (docs/plans/auth.md). The server checks again in app/(auth)/actions.ts.

/** The dashboard minimum (docs/plans/auth.md #23). Character rules come back from Supabase as WeakPasswordError reasons. */
export const MIN_PASSWORD = 10;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A message per field, keyed by the input's `name`. An empty object means the form can go to the server. */
export type AuthFieldErrors = { email?: string; password?: string };

function text(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
}

function checkEmail(data: FormData) {
  const email = text(data, "email").trim();
  if (!email) return "Enter your email address.";
  if (!EMAIL.test(email)) return "Enter an email address like name@example.com.";
}

function checkNewPassword(data: FormData, empty: string) {
  const password = text(data, "password");
  if (!password) return empty;
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
}

function only(errors: AuthFieldErrors): AuthFieldErrors {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

/** Sign-in checks presence and shape only. The length and character rules apply on sign-up (docs/plans/auth.md #23). */
export function validateSignIn(data: FormData): AuthFieldErrors {
  return only({
    email: checkEmail(data),
    password: text(data, "password") ? undefined : "Enter your password.",
  });
}

export function validateSignUp(data: FormData): AuthFieldErrors {
  return only({ email: checkEmail(data), password: checkNewPassword(data, "Enter a password.") });
}

export function validateResetRequest(data: FormData): AuthFieldErrors {
  return only({ email: checkEmail(data) });
}

export function validateNewPassword(data: FormData): AuthFieldErrors {
  return only({ password: checkNewPassword(data, "Enter a new password.") });
}
