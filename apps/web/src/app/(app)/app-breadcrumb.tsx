"use client";

import { usePathname } from "next/navigation";
import { navMain } from "@/components/nav-items";

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
  return <p className="app-page-name">{title ?? "Workspace"}</p>;
}
