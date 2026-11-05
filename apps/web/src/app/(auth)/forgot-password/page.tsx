import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { ForgotPasswordHeading } from "@/components/auth/auth-screens";

export const metadata: Metadata = {
  title: "Reset your password | Session Coach",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <>
      <ForgotPasswordHeading />
      <ForgotPasswordForm />
    </>
  );
}
