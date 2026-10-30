import type { Metadata } from "next";

import { AuthHeading } from "@/components/auth/auth-parts";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password | Session Coach",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading
        title={
          <>
            Reset your <span className="italic">password</span>
          </>
        }
      >
        Enter the address you sign in with and we&apos;ll email you a link to set a new password.
      </AuthHeading>
      <ForgotPasswordForm />
    </>
  );
}
