import type { Metadata } from "next";

import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = {
  title: "Create an account | Session Coach",
  robots: { index: false },
};

export default function SignUpPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-(--gutter-sm) pt-16 pb-20 sm:px-(--gutter) sm:pt-24 sm:pb-30">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-5xl leading-none tracking-tight text-text-1 sm:text-6xl">
          Create an <span className="italic">account</span>
        </h1>
        <p className="type-body text-pretty text-text-2">
          Explain back the decisions your coding agent made, and keep what you learn.
        </p>
      </div>
      <SignUpForm />
    </div>
  );
}
