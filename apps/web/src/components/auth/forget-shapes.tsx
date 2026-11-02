"use client";

import { useEffect } from "react";
import { forgetShapes } from "skullet";

/**
 * Clears skullet's remembered skeleton shapes from localStorage. The app's skeletons (MeasuredSuspense) never save
 * any, so this clears what an earlier build saved: copies of a learner's pages with their card and session ids, which
 * skullet would replay as the next skeleton. Rendered on every signed-out screen: sign-out lands on the marketing
 * site, an expired session on /login, and every sign-in starts from an auth screen.
 */
export function ForgetShapes() {
  useEffect(() => {
    forgetShapes();
  }, []);
  return null;
}
