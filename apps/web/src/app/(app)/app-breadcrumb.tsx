"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navMain } from "@/components/nav-items";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function AppBreadcrumb() {
  const pathname = usePathname();
  const page = navMain.find((item) => pathname.startsWith(item.url));
  // Session pages and the CLI approve page aren't in the main nav, so they get their own crumb.
  const title =
    page?.title ??
    (pathname.startsWith("/s/")
      ? "Session"
      : pathname.startsWith("/cli/")
        ? "Connect the CLI"
        : undefined);
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:inline-flex">
          <BreadcrumbLink render={<Link href="/dashboard" />}>Session Coach</BreadcrumbLink>
        </BreadcrumbItem>
        {title && (
          <>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
