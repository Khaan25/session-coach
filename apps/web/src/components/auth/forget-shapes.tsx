"use client";

import { useEffect } from "react";
import { forgetShapes } from "skullet";

/**
 * Clears skullet's remembered skeleton shapes. They sit in localStorage with the links they drew (the learner's card
 * and session ids), and skullet replays them as the next skeleton, so they must not outlive the session. Rendered on
 * every signed-out screen: sign-out lands on the marketing site, an expired session on /login, and every sign-in
 * starts from an auth screen.
 */
export function ForgetShapes() {
  useEffect(() => {
    forgetShapes();
  }, []);
  return null;
}
