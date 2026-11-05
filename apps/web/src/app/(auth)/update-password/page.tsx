import type { Metadata } from "next";

import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { UpdatePasswordHeading } from "@/components/auth/auth-screens";

export const metadata: Metadata = {
  title: "Set a new password | Session Coach",
  robots: { index: false },
};

// The reset link lands here after /auth/confirm signs the learner in with the recovery token.
export default function UpdatePasswordPage() {
  return (
    <>
      <UpdatePasswordHeading />
      <UpdatePasswordForm />
    </>
  );
}
