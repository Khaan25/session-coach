import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";

import { ResendConfirmation } from "@/components/auth/resend-confirmation";
import { buttonVariants } from "@/components/ui/button";
import { SIGNUP_EMAIL_COOKIE } from "@/lib/auth/signup-email";

export const metadata: Metadata = {
  title: "Check your email | Session Coach",
  robots: { index: false },
};

// The address comes from the httpOnly cookie signUp set, never the URL. A cookie read, so inside <Suspense>.
async function Resend() {
  const email = (await cookies()).get(SIGNUP_EMAIL_COOKIE)?.value;
  return email ? <ResendConfirmation email={email} /> : null;
}

// Every sign-up lands here, new address or not, so the page never says whether an account exists (docs/plans/auth.md #3).
export default function CheckEmailPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-(--gutter-sm) pt-16 pb-20 sm:px-(--gutter) sm:pt-24 sm:pb-30">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-5xl leading-none tracking-tight text-text-1 sm:text-6xl">
          Check your <span className="italic">email</span>
        </h1>
        <p className="type-body text-pretty text-text-2">
          If that address can sign up, we sent it a link to confirm the account. Open the link on
          this device to finish.
        </p>
      </div>
      <Suspense>
        <Resend />
      </Suspense>
      <p className="type-body-sm text-text-2">
        Already confirmed?{" "}
        <Link href="/login" className={buttonVariants({ variant: "link" })}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
