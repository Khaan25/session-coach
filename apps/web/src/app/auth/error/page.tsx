import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthNotice } from "@/components/auth/auth-notice";
import { AuthHeading } from "@/components/auth/auth-parts";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sign-in problem | Session Coach",
  robots: { index: false },
};

// Copy by code. The URL only ever picks one of these; its text is never shown (docs/plans/auth.md #7).
const COPY = {
  link_expired: {
    title: "This link has expired",
    body: "Links in our emails work once and expire after a while. Sign in to get a new confirmation link, or reset your password for a new reset link.",
  },
  invalid_link: {
    title: "This link is incomplete",
    body: "Open the link from the email again, or copy the whole address into the browser.",
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

const FALLBACK = {
  title: "Something went wrong signing in",
  body: "Try again. If it keeps happening, tell support.",
};

// The code is request data, so with cacheComponents it is read inside <Suspense>.
async function ErrorNotice({ searchParams }: Pick<PageProps<"/auth/error">, "searchParams">) {
  const { code } = await searchParams;
  const copy =
    typeof code === "string" && Object.hasOwn(COPY, code)
      ? COPY[code as keyof typeof COPY]
      : FALLBACK;
  return (
    <AuthNotice title={copy.title} fail>
      {copy.body}
    </AuthNotice>
  );
}

export default function AuthErrorPage({ searchParams }: PageProps<"/auth/error">) {
  return (
    <>
      <AuthHeading
        title={
          <>
            That didn&apos;t <span className="italic">work</span>
          </>
        }
      />
      <Suspense>
        <ErrorNotice searchParams={searchParams} />
      </Suspense>
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
    </>
  );
}
