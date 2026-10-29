"use client";

import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { ServerErrorState } from "@/components/errors/server-error-state";

/**
 * A whole-page error outside the app shell: the brand linking home and the error state. Not SiteNav: it reads
 * server-only account data, and an error page should depend on as little as possible.
 */
export function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-page">
      <header className="mx-auto flex h-18 w-full max-w-(--container) items-center px-(--gutter-sm) sm:h-20 sm:px-(--gutter)">
        <Link href="/" className="flex items-center gap-2 type-label text-text-1">
          <BrandMark className="size-6" />
          Session Coach
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-(--gutter-sm) pb-20 sm:px-(--gutter)">
        <ServerErrorState error={error} retry={retry} home={{ href: "/", label: "Go home" }} />
      </main>
    </div>
  );
}
