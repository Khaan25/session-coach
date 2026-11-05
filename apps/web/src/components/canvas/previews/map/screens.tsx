"use client";

// The two screens the canvas page renders on the server (see ServerScreens): the landing page in the marketing frame,
// and the daily review email as the cron sends it.

import { PublicFrame } from "../frames";
import { useServerScreen } from "../server-screens";

export function MapHome() {
  return <PublicFrame path="/">{useServerScreen("home")}</PublicFrame>;
}

export function MapEmail() {
  return <div className="flex h-full flex-col bg-page">{useServerScreen("email")}</div>;
}
