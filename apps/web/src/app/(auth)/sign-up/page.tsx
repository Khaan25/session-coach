import type { Metadata } from "next";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { SignUpHeading } from "@/components/auth/auth-screens";

export const metadata: Metadata = {
  title: "Create an account | Session Coach",
  robots: { index: false },
};

export default function SignUpPage() {
  return (
    <>
      <SignUpHeading />
      <SignUpForm />
    </>
  );
}
