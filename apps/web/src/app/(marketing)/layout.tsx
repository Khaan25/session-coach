import { ViewTransition } from "react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";
import { SkipLink } from "@/components/skip-link";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-page">
      <SkipLink />
      <SiteNav />
      <main id="main" className="flex-1">
        {/* Only the page crossfades on navigation; the nav and footer hold still (styles/theme.css). */}
        <ViewTransition default="route-fade">{children}</ViewTransition>
      </main>
      <SiteFooter />
    </div>
  );
}
