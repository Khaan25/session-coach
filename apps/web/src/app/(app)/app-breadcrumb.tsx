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
  let title = page?.title;
  if (title === undefined && pathname.startsWith("/s/")) {
    title = "Session";
  } else if (title === undefined && pathname.startsWith("/cli/")) {
    title = "Connect the CLI";
  }
  if (!title) {
    return null;
  }
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
