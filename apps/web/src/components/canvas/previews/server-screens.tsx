"use client";

import { createContext, use } from "react";

/**
 * Screens rendered on the server by app/canvas/page.tsx and handed down, because they can't be bundled into the
 * client canvas: the public pages (route modules, which export metadata, so a client module can't import them) and
 * the daily email (React Email, rendered to HTML as the cron sends it).
 */
export type ServerScreens = {
  home: React.ReactNode;
  howItWorks: React.ReactNode;
  pricing: React.ReactNode;
  email: React.ReactNode;
};

export const ServerScreensContext = createContext<ServerScreens>({
  home: null,
  howItWorks: null,
  pricing: null,
  email: null,
});

export function useServerScreen(name: keyof ServerScreens) {
  return use(ServerScreensContext)[name];
}
