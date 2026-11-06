"use client";

import { usePathname } from "next/navigation";

import { navMain, navOther } from "@/components/nav-items";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

/** The topbar's current page title. The sidebar already names the app, so there is no root crumb. */
export function AppBreadcrumb() {
  const pathname = usePathname();
  const page = [...navMain, ...navOther].find((item) => pathname.startsWith(item.url));
  // Session pages and the CLI approve page aren't in any nav list, so they get their own title.
  const title =
    page?.title ??
    (pathname.startsWith("/s/")
      ? "Session"
      : pathname.startsWith("/cli/")
        ? "Connect the CLI"
        : undefined);
  if (!title) return null;
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>{title}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
