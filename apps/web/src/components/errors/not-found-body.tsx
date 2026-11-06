import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

/** app/not-found.tsx's page under the marketing nav: the 404 and the way on. Shared with /canvas. */
export function NotFoundBody() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center gap-8 px-(--gutter-sm) py-20 sm:px-(--gutter) sm:py-30">
      <div className="flex flex-col gap-3">
        <p className="type-label text-text-3">Error 404</p>
        <h1 className="type-display-lg text-balance text-text-1">
          This page isn&apos;t in the deck
        </h1>
        <p className="type-body-lg text-pretty text-text-2">The link may be old or mistyped.</p>
      </div>
      <Link href="/" className={buttonVariants({ size: "lg" })}>
        Go home
      </Link>
      <p className="type-body-sm text-text-2">
        <Link href="/dashboard" className={buttonVariants({ variant: "link" })}>
          Open the dashboard
        </Link>{" "}
        or{" "}
        <Link href="/support" className={buttonVariants({ variant: "link" })}>
          tell support
        </Link>
      </p>
    </div>
  );
}
