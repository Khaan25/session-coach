import { ViewTransition } from "react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-page">
      <SiteNav />
      <main className="flex-1">
        {/* Only the page crossfades on navigation; the nav and footer hold still (styles/theme.css). */}
        <ViewTransition default="route-fade">{children}</ViewTransition>
      </main>
      <SiteFooter />
    </div>
  );
}
