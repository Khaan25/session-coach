"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useOptimisticNavigation } from "@/hooks/use-optimistic-navigation";

export function NavMain({
  items,
}: {
  /** `badge`: a count shown at the row's end, such as cards due today; hidden when 0. */
  items: { title: string; url: string; icon: React.ReactNode; badge?: number }[];
}) {
  // The clicked row turns current at once; the new page's skeleton or content follows.
  const { current: pathname, navigate } = useOptimisticNavigation(usePathname());
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Learn</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              tooltip={item.title}
              isActive={pathname === item.url || pathname.startsWith(`${item.url}/`)}
              render={<Link href={item.url} onNavigate={navigate(item.url, item.url)} />}
            >
              {item.icon}
              <span>{item.title}</span>
            </SidebarMenuButton>
            {item.badge ? (
              <SidebarMenuBadge aria-label={`${item.badge} due today`}>
                {item.badge}
              </SidebarMenuBadge>
            ) : null}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
