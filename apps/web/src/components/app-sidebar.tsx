"use client";

import * as React from "react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { navMain } from "@/components/nav-items";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar({
  dueCount,
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  /** Cards due today, shown on the Review row; 0 hides the badge. */
  dueCount: number;
  /** Null while signed out or loading: the footer is then empty. */
  user: React.ComponentProps<typeof NavUser>["user"] | null;
}) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <BrandMark />
              <span>Session Coach</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={navMain.map((item) =>
            item.url === "/review" ? { ...item, badge: dueCount } : item,
          )}
        />
      </SidebarContent>
      {/* One control: the account menu, which also holds the theme. */}
      <SidebarFooter>{user && <NavUser user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
