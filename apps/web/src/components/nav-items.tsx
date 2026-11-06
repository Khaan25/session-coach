"use client";

import {
  ChartLineUpIcon,
  ExamIcon,
  GearIcon,
  ShieldCheckIcon,
  SquaresFourIcon,
  TerminalWindowIcon,
  UsersIcon,
} from "@phosphor-icons/react";

/** The sidebar's Learn group, in its own file so the breadcrumb and /canvas's frame read it without the sidebar. */
// Routes from docs/plans/pages-and-dashboard.md.
export const navMain = [
  { title: "Dashboard", url: "/dashboard", icon: <SquaresFourIcon /> },
  { title: "Review", url: "/review", icon: <ExamIcon /> },
  { title: "Defend it", url: "/defend", icon: <ShieldCheckIcon /> },
  { title: "Progress", url: "/progress", icon: <ChartLineUpIcon /> },
  { title: "Setup", url: "/setup", icon: <TerminalWindowIcon /> },
  { title: "Members", url: "/members", icon: <UsersIcon /> },
  { title: "Settings", url: "/settings", icon: <GearIcon /> },
];
