import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthNotice } from "@/components/auth/auth-notice";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { confirmEmail } from "./actions";

export const metadata: Metadata = {
  title: "Confirm | Session Coach",
  robots: { index: false },
};

function first(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

// The link's query is request data, so with cacheComponents it is read inside <Suspense>.
async function ConfirmForm({ searchParams }: Pick<PageProps<"/auth/confirm">, "searchParams">) {
  const params = await searchParams;
  const tokenHash = first(params.token_hash);
  const type = first(params.type);
  if (!tokenHash || !type)
    return (
      <AuthNotice title="This link is incomplete" fail>
        Open the link from the email again, or copy the whole address into the browser.
      </AuthNotice>
    );

  const recovery = type === "recovery";
  return (
    <Card size="lg">
      <CardContent>
        <form action={confirmEmail} className="flex flex-col">
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="next" value={first(params.next) ?? ""} />
          <Button type="submit" size="lg">
            {recovery ? "Continue to set a password" : "Confirm and sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// A page with a button, not a GET handler: email link scanners open links before people do and would spend the
// one-time token (docs/plans/auth.md #8).
export default function ConfirmPage({ searchParams }: PageProps<"/auth/confirm">) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-(--gutter-sm) pt-16 pb-20 sm:px-(--gutter) sm:pt-24 sm:pb-30">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-5xl leading-none tracking-tight text-text-1 sm:text-6xl">
          One more <span className="italic">step</span>
        </h1>
        <p className="type-body text-pretty text-text-2">
          Press the button to finish. The link works once.
        </p>
      </div>
      <Suspense>
        <ConfirmForm searchParams={searchParams} />
      </Suspense>
      <p className="type-body-sm text-text-2">
        Didn&apos;t ask for this?{" "}
        <Link href="/" className={buttonVariants({ variant: "link" })}>
          Go home
        </Link>
      </p>
    </div>
  );
}
