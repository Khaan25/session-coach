import type { Metadata } from "next";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";
import { NotFoundBody } from "@/components/errors/not-found-body";

export const metadata: Metadata = { title: "Page not found | Session Coach" };

// Every unknown URL lands here. It sits outside (marketing), so it brings the marketing nav and footer itself.
export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-page">
      <SiteNav />
      <main className="flex flex-1 flex-col">
        <NotFoundBody />
      </main>
      <SiteFooter />
    </div>
  );
}
