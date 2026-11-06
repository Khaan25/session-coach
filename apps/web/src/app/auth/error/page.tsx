import type { Metadata } from "next";
import { Suspense } from "react";

import {
  AuthErrorActions,
  AuthErrorHeading,
  AuthErrorNotice,
} from "@/components/auth/auth-screens";

export const metadata: Metadata = {
  title: "Sign-in problem | Session Coach",
  robots: { index: false },
};

// The code is request data, so with cacheComponents it is read inside <Suspense>.
async function ErrorNotice({ searchParams }: Pick<PageProps<"/auth/error">, "searchParams">) {
  const { code } = await searchParams;
  return <AuthErrorNotice code={typeof code === "string" ? code : undefined} />;
}

export default function AuthErrorPage({ searchParams }: PageProps<"/auth/error">) {
  return (
    <>
      <AuthErrorHeading />
      <Suspense>
        <ErrorNotice searchParams={searchParams} />
      </Suspense>
      <AuthErrorActions />
    </>
  );
}
