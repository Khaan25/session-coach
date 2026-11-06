"use client";

import Link from "next/link";
import { parseProjectScope, projectHref, type ProjectScope } from "@/lib/projects/scope";
import { useSearchParams, usePathname } from "next/navigation";
import { NavigationFeedback } from "@/components/app/navigation-feedback";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
  scope = "all",
}: {
  /** `badge`: a count shown at the row's end, such as cards due today; hidden when 0. */
  scope?: ProjectScope;
  items: { title: string; url: string; icon: React.ReactNode; badge?: number }[];
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const groups = [
    {
      label: "Learning",
      items: items.filter((item) =>
        ["/dashboard", "/review", "/defend", "/progress"].includes(item.url),
      ),
    },
    {
      label: "Workspace",
      items: items.filter(
        (item) => !["/dashboard", "/review", "/defend", "/progress"].includes(item.url),
      ),
    },
  ];
  return (
    <nav className="workspace-navigation" aria-label="Main navigation">
      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  variant="navigation"
                  tooltip={item.title}
                  isActive={pathname === item.url || pathname.startsWith(`${item.url}/`)}
                  render={
                    <Link
                      href={item.url === "/defend" ? item.url : projectHref(item.url, scope)}
                      onClick={() => setOpenMobile(false)}
                    />
                  }
                >
                  {item.icon}
                  <span>{item.title}</span>
                  <NavigationFeedback />
                </SidebarMenuButton>
                {item.badge && scope === "all" ? (
                  <SidebarMenuBadge aria-label={`${item.badge} due today`}>
                    {item.badge}
                  </SidebarMenuBadge>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </nav>
  );
}

export function ScopedNavMain(props: React.ComponentProps<typeof NavMain>) {
  const search = useSearchParams();
  return (
    <NavMain
      {...props}
      scope={parseProjectScope(
        search.get("project") ?? (search.get("repo") ? "repo:" + search.get("repo") : null),
      )}
    />
  );
}
