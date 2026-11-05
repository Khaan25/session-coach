import type { Metadata } from "next";

import { AuthHeading } from "@/components/auth/auth-parts";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = {
  title: "Create an account | Session Coach",
  robots: { index: false },
};

export default function SignUpPage() {
  return (
    <>
      <AuthHeading
        title={
          <>
            Create an <span className="italic">account</span>
          </>
        }
      >
        Track the decisions your coding agent makes, project by project, until you own them.
      </AuthHeading>
      <SignUpForm />
    </>
  );
}
