import type { Metadata } from "next";

import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = {
  title: "Set a new password | Session Coach",
  robots: { index: false },
};

// The reset link lands here after /auth/confirm signs the learner in with the recovery token.
export default function UpdatePasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-(--gutter-sm) pt-16 pb-20 sm:px-(--gutter) sm:pt-24 sm:pb-30">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-5xl leading-none tracking-tight text-text-1 sm:text-6xl">
          Set a new <span className="italic">password</span>
        </h1>
        <p className="type-body text-pretty text-text-2">
          Choose the password you&apos;ll sign in with from now on.
        </p>
      </div>
      <UpdatePasswordForm />
    </div>
  );
}
