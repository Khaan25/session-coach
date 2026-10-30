import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthHeading } from "@/components/auth/auth-parts";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in | Session Coach",
  robots: { index: false },
};

// ?next= is request data, so with cacheComponents it is read inside <Suspense>. The shell's form works without it.
async function LoginFormWithNext({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : undefined} />;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <AuthHeading
        title={
          <>
            Sign <span className="italic">in</span>
          </>
        }
      >
        Pick up your decision cards where you left them.
      </AuthHeading>
      <Suspense fallback={<LoginForm />}>
        <LoginFormWithNext searchParams={searchParams} />
      </Suspense>
    </>
  );
}
