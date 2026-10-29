"use client";

import * as React from "react";
import Link from "next/link";
import {
  ExamIcon,
  ChartLineUpIcon,
  GearIcon,
  SquaresFourIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react";

import { BrandMark } from "@/components/brand-mark";
import { NavMain } from "@/components/nav-main";
import { NavSessions } from "@/components/nav-sessions";
import { NavUser } from "@/components/nav-user";
import { ThemeToggle } from "@/components/theme/theme-toggle";
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

// Routes from docs/plans/pages-and-dashboard.md. Only /dashboard exists so far; the rest land in later phases.
export const navMain = [
  { title: "Dashboard", url: "/dashboard", icon: <SquaresFourIcon /> },
  // TODO(zia): due count from Phase 6 as a SidebarMenuBadge.
  { title: "Review", url: "/review", icon: <ExamIcon /> },
  { title: "Progress", url: "/progress", icon: <ChartLineUpIcon /> },
  { title: "Setup", url: "/setup", icon: <TerminalWindowIcon /> },
  { title: "Settings", url: "/settings", icon: <GearIcon /> },
];

export function AppSidebar({
  sessions,
  userId,
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  sessions: SessionListItem[];
  /** Turns on live status updates for the sessions; null while signed out or loading. */
  userId: string | null;
  /** Null while signed out or loading: the footer then shows only the theme toggle. */
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
        <NavMain items={navMain} />
        <NavSessions sessions={sessions} userId={userId} />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">{user && <NavUser user={user} />}</div>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
