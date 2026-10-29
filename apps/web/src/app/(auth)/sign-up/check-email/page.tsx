import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";

import { AuthHeading, AuthSwitch } from "@/components/auth/auth-parts";
import { ResendConfirmation } from "@/components/auth/resend-confirmation";
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
    <>
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
      <Suspense>
        <Resend />
      </Suspense>
      <AuthSwitch prompt="Already confirmed?" href="/login">
        Sign in
      </AuthSwitch>
    </>
  );
}
