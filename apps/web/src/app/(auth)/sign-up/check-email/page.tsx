import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";

import { AuthSwitch } from "@/components/auth/auth-parts";
import { CheckEmailHeading } from "@/components/auth/auth-screens";
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
      <CheckEmailHeading />
      <Suspense>
        <Resend />
      </Suspense>
      <AuthSwitch prompt="Already confirmed?" href="/login">
        Sign in
      </AuthSwitch>
    </>
  );
}
