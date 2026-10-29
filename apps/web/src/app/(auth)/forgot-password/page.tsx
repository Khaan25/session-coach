import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password | Session Coach",
  robots: { index: false },
};

// A UI mock until auth (Phase 2).
export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-(--gutter-sm) pt-16 pb-20 sm:px-(--gutter) sm:pt-24 sm:pb-30">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-5xl leading-none tracking-tight text-text-1 sm:text-6xl">
          Reset your <span className="italic">password</span>
        </h1>
        <p className="type-body text-pretty text-text-2">
          Enter the address you sign in with and we&apos;ll email you a link to set a new password.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
