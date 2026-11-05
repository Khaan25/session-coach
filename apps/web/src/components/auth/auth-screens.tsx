import Link from "next/link";

import { AuthNotice } from "@/components/auth/auth-notice";
import { AuthHeading, BrandLink } from "@/components/auth/auth-parts";
import { buttonVariants } from "@/components/ui/button";

// What every auth screen shares, so the pages and /canvas render the same layout, headings and copy: the shell, each
// route's heading, and /auth/error's notice by code. The forms are the real ones in this folder.

const FOOTER_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/support", label: "Support" },
] as const;

/**
 * Signed-out screens, after shadcn's login-02: the form column on the left with the brand at its top, the art on the
 * right from lg up (option B's explain panel over the painting). Only the brand, never the marketing nav or the
 * account menu.
 */
export function AuthShell({ art, children }: { art: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid min-h-full flex-1 bg-page lg:grid-cols-2">
      <div className="flex flex-col">
        <header className="flex h-18 items-center px-(--gutter-sm) sm:h-20 sm:px-(--gutter)">
          <BrandLink />
        </header>
        <main className="flex flex-1 flex-col justify-center">
          {/* The one form column every auth screen sits in. */}
          <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-(--gutter-sm) pt-16 pb-20 sm:px-(--gutter) sm:pt-24 sm:pb-30">
            {children}
          </div>
        </main>
        <footer className="px-(--gutter-sm) py-8 sm:px-(--gutter)">
          <ul className="flex justify-center gap-6">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="type-body-sm text-text-2 transition-colors duration-(--dur-fast) hover:text-text-1"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </footer>
      </div>
      {art}
    </div>
  );
}

export function LoginHeading() {
  return (
    <AuthHeading
      title={
        <>
          Sign <span className="italic">in</span>
        </>
      }
    >
      Your due cards are where you left them.
    </AuthHeading>
  );
}

export function SignUpHeading() {
  return (
    <AuthHeading
      title={
        <>
          Create an <span className="italic">account</span>
        </>
      }
    >
      Explain back the decisions your coding agent made, and keep what you learn.
    </AuthHeading>
  );
}

export function CheckEmailHeading() {
  return (
    <AuthHeading
      title={
        <>
          Check your <span className="italic">email</span>
        </>
      }
    >
      If that address can sign up, we sent it a link to confirm the account. Open the link on this
      device to finish.
    </AuthHeading>
  );
}

export function ForgotPasswordHeading() {
  return (
    <AuthHeading
      title={
        <>
          Reset your <span className="italic">password</span>
        </>
      }
    >
      Enter the address you sign in with and we&apos;ll email you a link to set a new password.
    </AuthHeading>
  );
}

export function UpdatePasswordHeading() {
  return (
    <AuthHeading
      title={
        <>
          Set a new <span className="italic">password</span>
        </>
      }
    >
      Choose the password you&apos;ll sign in with from now on.
    </AuthHeading>
  );
}

export function ConfirmHeading() {
  return (
    <AuthHeading
      title={
        <>
          One more <span className="italic">step</span>
        </>
      }
    >
      Press the button to finish. The link works once.
    </AuthHeading>
  );
}

/** /auth/error's copy by code. The URL only ever picks one of these; its text is never shown (docs/plans/auth.md #7). */
export const AUTH_ERRORS = {
  link_expired: {
    title: "This link was already used or has expired",
    body: "Each email link works once. If you opened it before, your account may already be confirmed: try signing in. Otherwise, signing in sends a new confirmation link, and Reset password sends a new reset link.",
  },
  invalid_link: {
    title: "This link is incomplete",
    body: "Open the link from the email again, or copy the whole address into the browser.",
  },
  reset_failed: {
    title: "This reset link didn't work here",
    body: "Reset links work once, in the browser you asked from. Request a new link from this browser.",
  },
  confirmed_sign_in: {
    title: "Your email is confirmed",
    body: "This browser isn't the one you signed up in, so sign in here to continue.",
  },
  confirm_failed: {
    title: "We couldn't confirm that link",
    body: "It may have been used already. Sign in, or ask for a new link.",
  },
  access_denied: {
    title: "Google sign-in was cancelled",
    body: "Nothing changed. Try again whenever you're ready.",
  },
  oauth_failed: {
    title: "Google sign-in didn't finish",
    body: "Start again from this browser. If it keeps failing, sign in with email instead.",
  },
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERRORS;

const FALLBACK = {
  title: "Something went wrong signing in",
  body: "Try again. If it keeps happening, tell support.",
};

export function AuthErrorHeading() {
  return (
    <AuthHeading
      title={
        <>
          That didn&apos;t <span className="italic">work</span>
        </>
      }
    />
  );
}

/** The notice for a code from the URL; an unknown or missing code gets the fallback. */
export function AuthErrorNotice({ code }: { code: string | undefined }) {
  const copy =
    code && Object.hasOwn(AUTH_ERRORS, code) ? AUTH_ERRORS[code as AuthErrorCode] : FALLBACK;
  return (
    <AuthNotice title={copy.title} fail>
      {copy.body}
    </AuthNotice>
  );
}

export function AuthErrorActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link href="/login" className={buttonVariants({ size: "lg" })}>
        Sign in
      </Link>
      <Link
        href="/forgot-password"
        className={buttonVariants({ variant: "secondary", size: "lg" })}
      >
        Reset password
      </Link>
    </div>
  );
}
