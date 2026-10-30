import type { ReactNode } from "react";

/** The top of a public page: the page's one h1 in the display face and a short lead. */
export function MarketingPageHeader({ title, children }: { title: string; children: ReactNode }) {
  return (
    <header className="flex max-w-2xl flex-col gap-4">
      <h1 className="font-display text-5xl leading-none text-balance text-text-1 sm:text-6xl">
        {title}
      </h1>
      <p className="type-body-lg text-pretty text-text-2">{children}</p>
    </header>
  );
}
