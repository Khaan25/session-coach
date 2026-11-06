"use client";

import * as React from "react";
import { ProjectLink as Link } from "@/components/projects/project-link";
import {
  ArrowUpRightIcon,
  XIcon,
  ExamIcon,
  ChartLineUpIcon,
  GearIcon,
  ShieldCheckIcon,
  SquaresFourIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { NavMain, ScopedNavMain } from "@/components/nav-main";
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
  useSidebar,
} from "@/components/ui/sidebar";
import type { SessionListItem } from "@/lib/sessions/rows";

// Routes from docs/plans/pages-and-dashboard.md.
export const navMain = [
  { title: "Today", url: "/dashboard", icon: <SquaresFourIcon weight="duotone" /> },
  { title: "Review", url: "/review", icon: <ExamIcon weight="duotone" /> },
  { title: "Defend it", url: "/defend", icon: <ShieldCheckIcon weight="duotone" /> },
  { title: "Sessions", url: "/sessions", icon: <TerminalWindowIcon weight="duotone" /> },
  { title: "Progress", url: "/progress", icon: <ChartLineUpIcon weight="duotone" /> },
  { title: "Setup", url: "/setup", icon: <TerminalWindowIcon weight="duotone" /> },
  { title: "Settings", url: "/settings", icon: <GearIcon weight="duotone" /> },
];

export function AppSidebar({
  sessions: _sessions,
  dueCount,
  userId: _userId,
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  sessions: SessionListItem[];
  /** Cards due today, shown on the Review row; 0 hides the badge. */
  dueCount: number;
  /** Turns on live status updates for the sessions; null while signed out or loading. */
  userId: string | null;
  /** Null while signed out or loading: the footer then shows only the theme toggle. */
  user: React.ComponentProps<typeof NavUser>["user"] | null;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <MobileNavigationClose />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              variant="brand"
              render={<Link href="/dashboard" onClick={() => setOpenMobile(false)} />}
            >
              <BrandMark />
              <span>Session Coach</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <React.Suspense fallback={<NavMain items={navMain} />}>
          <ScopedNavMain
            items={navMain.map((item) =>
              item.url === "/review" ? { ...item, badge: dueCount } : item,
            )}
          />
        </React.Suspense>
      </SidebarContent>
      <SidebarFooter>
        <div className="workspace-sidebar-connect group-data-[collapsible=icon]:hidden">
          <TerminalWindowIcon aria-hidden />
          <Link href="/setup" onClick={() => setOpenMobile(false)}>
            Connect your agent <ArrowUpRightIcon aria-hidden />
          </Link>
        </div>
        <div className="workspace-sidebar-footer">
          <div className="min-w-0 flex-1">{user && <NavUser user={user} />}</div>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function MobileNavigationClose() {
  const { setOpenMobile } = useSidebar();
  return (
    <div className="sidebar-mobile-close">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Close navigation"
        onClick={() => setOpenMobile(false)}
      >
        <XIcon aria-hidden />
      </Button>
    </div>
  );
}
