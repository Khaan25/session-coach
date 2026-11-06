import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div data-learning="" className="marketing-shell flex min-h-full flex-1 flex-col bg-page">
      <SiteNav />
      <main id="main-content" className="marketing-main flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
