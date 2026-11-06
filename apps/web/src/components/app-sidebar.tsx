"use client";

import * as React from "react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { navMain } from "@/components/nav-items";
import { NavMain } from "@/components/nav-main";
import { NavSessions } from "@/components/nav-sessions";
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
import type { SessionListItem } from "@/lib/sessions/rows";

export function AppSidebar({
  sessions,
  dueCount,
  userId,
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  sessions: SessionListItem[];
  /** Cards due today, shown on the Review row; 0 hides the badge. */
  dueCount: number;
  /** Turns on live status updates for the sessions; null while signed out or loading. */
  userId: string | null;
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
        <NavSessions sessions={sessions} userId={userId} />
      </SidebarContent>
      {/* One control: the account menu, which also holds the theme. */}
      <SidebarFooter>{user && <NavUser user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
