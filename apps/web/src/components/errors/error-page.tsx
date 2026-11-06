"use client";

import { BrandLink } from "@/components/auth/auth-parts";
import { ServerErrorState } from "@/components/errors/server-error-state";

/**
 * A whole-page error outside the app shell: the brand linking home and the error state, in the auth screens' one
 * centred column. Not SiteNav: it reads server-only account data, and an error page should depend on as little as
 * possible.
 */
export function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-page">
      <header className="flex h-18 items-center justify-center px-(--gutter-sm) sm:h-20 sm:px-(--gutter)">
        <BrandLink />
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-(--gutter-sm) pb-20 sm:px-(--gutter)">
        <ServerErrorState error={error} retry={retry} home={{ href: "/", label: "Go home" }} />
      </main>
    </div>
  );
}
