"use client";

import { useEffect } from "react";

import { adoptBrowserTimezone } from "@/app/(app)/settings/actions";

/**
 * Sends the browser's time zone once, for a learner whose profile still has the UTC default. The server action
 * decides whether to keep it (new accounts only). Renders nothing.
 */
export function DetectTimezone() {
  useEffect(() => {
    void adoptBrowserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);
  return null;
}
