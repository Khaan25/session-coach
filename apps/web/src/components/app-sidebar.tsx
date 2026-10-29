"use client";

import * as React from "react";
import Link from "next/link";
import type { Session } from "@session-coach/shared/session";
import {
  CardsIcon,
  ChartLineUpIcon,
  GearIcon,
  GraduationCapIcon,
  ShieldCheckIcon,
  SquaresFourIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
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

// Routes from docs/plans/pages-and-dashboard.md. Only /dashboard exists so far; the rest land in later phases.
export const navMain = [
  { title: "Dashboard", url: "/dashboard", icon: <SquaresFourIcon /> },
  // TODO(zia): due count from Phase 6 as a SidebarMenuBadge.
  { title: "Review", url: "/review", icon: <CardsIcon /> },
  { title: "Progress", url: "/progress", icon: <ChartLineUpIcon /> },
  { title: "Setup", url: "/setup", icon: <TerminalWindowIcon /> },
  { title: "Settings", url: "/settings", icon: <GearIcon /> },
];

const navSecondary = [
  { title: "Privacy", url: "/privacy", icon: <ShieldCheckIcon /> },
  // TODO(zia): a Feedback item, once there is somewhere for feedback to go (a "#" link was a dead tab stop).
];

// TODO(zia): the signed-in profile (display_name, email, avatar_url) once auth lands.
const user = { name: "Learner", detail: "Not signed in", initials: "L" };

export function AppSidebar({
  sessions,
  ...props
}: React.ComponentProps<typeof Sidebar> & { sessions: Session[] }) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <GraduationCapIcon />
              <span>Session Coach</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSessions sessions={sessions} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
