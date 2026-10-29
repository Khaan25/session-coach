import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthNotice } from "@/components/auth/auth-notice";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sign-in problem | Session Coach",
  robots: { index: false },
};

// Copy by code. The URL only ever picks one of these; its text is never shown (docs/plans/auth.md #7).
const COPY = {
  link_expired: {
    title: "This link has expired",
    body: "Links in our emails work once and expire after a while. Ask for a new one below.",
  },
  invalid_link: {
    title: "This link is incomplete",
    body: "Open the link from the email again, or copy the whole address into the browser.",
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
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-(--gutter-sm) pt-16 pb-20 sm:px-(--gutter) sm:pt-24 sm:pb-30">
      <h1 className="font-display text-5xl leading-none tracking-tight text-text-1 sm:text-6xl">
        That didn&apos;t <span className="italic">work</span>
      </h1>
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
          Get a new link
        </Link>
      </div>
    </div>
  );
}
