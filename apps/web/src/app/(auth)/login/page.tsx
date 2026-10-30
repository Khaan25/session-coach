import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in | Session Coach",
  robots: { index: false },
};

// A UI mock until auth (Phase 2).
// TODO(zia): read ?next= (inside <Suspense>, cacheComponents) and pass it through to the sign-in actions.
export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-(--gutter-sm) pt-16 pb-20 sm:px-(--gutter) sm:pt-24 sm:pb-30">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-5xl leading-none tracking-tight text-text-1 sm:text-6xl">
          Sign <span className="italic">in</span>
        </h1>
        <p className="type-body text-pretty text-text-2">
          Pick up your decision cards where you left them.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
