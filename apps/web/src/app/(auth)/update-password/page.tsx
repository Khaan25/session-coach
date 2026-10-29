import type { Metadata } from "next";

import { AuthHeading } from "@/components/auth/auth-parts";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = {
  title: "Set a new password | Session Coach",
  robots: { index: false },
};

// The reset link lands here after /auth/confirm signs the learner in with the recovery token.
export default function UpdatePasswordPage() {
  return (
    <>
      <AuthHeading
        title={
          <>
            Set a new <span className="italic">password</span>
          </>
        }
      >
        Choose the password you&apos;ll sign in with from now on.
      </AuthHeading>
      <UpdatePasswordForm />
    </>
  );
}
