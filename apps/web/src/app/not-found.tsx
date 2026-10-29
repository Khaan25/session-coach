import { HouseIcon, SquaresFourIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found | Session Coach" };

// Every unknown URL lands here. It sits outside (marketing), so it brings the marketing nav and footer itself.
export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-page">
      <SiteNav />
      <main className="relative isolate flex flex-1 flex-col overflow-hidden">
        {/* The landing's ruled index-card field, here as the page's floor. */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-56 well sm:h-72">
          <svg className="size-full text-line-row">
            <defs>
              <pattern id="not-found-lines" width="8" height="28" patternUnits="userSpaceOnUse">
                <line x1="0" y1="27.5" x2="8" y2="27.5" stroke="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#not-found-lines)" />
          </svg>
        </div>

        <div className="mx-auto flex w-full max-w-(--container) flex-col items-start px-(--gutter-sm) pt-20 pb-72 sm:px-(--gutter) sm:pt-30 sm:pb-96">
          <p className="type-label text-text-3">Error 404</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-none tracking-tight text-balance text-text-1 sm:text-7xl">
            This page isn&apos;t <span className="italic">in the deck.</span>
          </h1>
          <p className="mt-6 max-w-lg type-body-lg text-pretty text-text-2">
            The link may be old or mistyped. Pick up from one of these instead.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/" className={buttonVariants({ size: "lg" })}>
              <HouseIcon weight="duotone" data-icon="inline-start" aria-hidden />
              Go home
            </Link>
            <Link
              href="/dashboard"
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              <SquaresFourIcon weight="duotone" data-icon="inline-start" aria-hidden />
              Open the dashboard
            </Link>
          </div>
          <p className="mt-6 type-body-sm text-text-2">
            Followed a link from Session Coach?{" "}
            <Link href="/support" className={buttonVariants({ variant: "link" })}>
              Tell support
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
