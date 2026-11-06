"use client";

import { ChartLineUpIcon, ExamIcon, GearIcon, SunIcon } from "@phosphor-icons/react";

/** The sidebar's Learn group, in its own file so the breadcrumb and /canvas's frame read it without the sidebar. */
// Four rows (DECISIONS, 2026-11-06 "Today replaces the dashboard"): Setup is reached from Today and Settings, Defend it
// from Today's done state and /progress, Members from Settings.
export const navMain = [
  { title: "Today", url: "/dashboard", icon: <SunIcon /> },
  { title: "Review", url: "/review", icon: <ExamIcon /> },
  { title: "Progress", url: "/progress", icon: <ChartLineUpIcon /> },
  { title: "Settings", url: "/settings", icon: <GearIcon /> },
];

/** Pages off the sidebar that still name themselves in the topbar. */
export const navOther = [
  { title: "Setup", url: "/setup" },
  { title: "Defend it", url: "/defend" },
  { title: "Members", url: "/members" },
];
