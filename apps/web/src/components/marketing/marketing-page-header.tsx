import type { ReactNode } from "react";

/** The top of a public page: the page's one h1, large and tight, and a muted lead under it. */
export function MarketingPageHeader({ title, children }: { title: string; children: ReactNode }) {
  return (
    <header className="flex max-w-160 flex-col gap-4">
      <h1 className="type-display text-balance text-text-1 sm:type-display-xl">{title}</h1>
      <div className="type-body-lg text-pretty text-text-2">{children}</div>
    </header>
  );
}

/**
 * A public page that answers one question: the header, then the content, all in one 640px column.
 *
 * @param title - The page's one h1.
 * @param lead - The muted line under it.
 * @param children - The page's content, under the header.
 */
export function MarketingPage({
  title,
  lead,
  children,
}: {
  title: string;
  lead: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto box-content flex max-w-160 flex-col gap-12 px-(--gutter-sm) py-16 sm:px-(--gutter) sm:py-24">
      <MarketingPageHeader title={title}>{lead}</MarketingPageHeader>
      {children}
    </div>
  );
}
