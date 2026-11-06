import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { LoginHeading } from "@/components/auth/auth-screens";

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
      <LoginHeading />
      <Suspense fallback={<LoginForm />}>
        <LoginFormWithNext searchParams={searchParams} />
      </Suspense>
    </>
  );
}
