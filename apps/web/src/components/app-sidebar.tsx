"use client";

import * as React from "react";
import Link from "next/link";
import type { Session } from "@session-coach/shared/session";
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

// Routes from docs/plans/pages-and-dashboard.md. Only /dashboard exists so far; the rest land in later phases.
export const navMain = [
  { title: "Dashboard", url: "/dashboard", icon: <SquaresFourIcon /> },
  // TODO(zia): due count from Phase 6 as a SidebarMenuBadge.
  { title: "Review", url: "/review", icon: <ExamIcon /> },
  { title: "Progress", url: "/progress", icon: <ChartLineUpIcon /> },
  { title: "Setup", url: "/setup", icon: <TerminalWindowIcon /> },
  { title: "Settings", url: "/settings", icon: <GearIcon /> },
];

// TODO(zia): the signed-in profile (display_name, email, avatar_url) once auth lands.

export function AppSidebar({
  sessions,
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  sessions: Session[];
  user: React.ComponentProps<typeof NavUser>["user"];
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
        <NavSessions sessions={sessions} />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <NavUser user={user} />
          </div>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
