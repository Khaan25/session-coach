"use client";

import { createContext, use } from "react";

/**
 * True on /canvas, where the real settings and setup controls are drawn with synthetic data: a control that would save
 * or revoke through a Server Action or a route does nothing instead, so a click there never touches the signed-in
 * visitor's own account. False everywhere else.
 */
export const DryRunContext = createContext(false);

/** The Server Action, or under DryRunContext a stand-in that saves nothing and reports success. */
export function useAction<Args extends unknown[]>(
  action: (...args: Args) => Promise<{ error: string | null }>,
): (...args: Args) => Promise<{ error: string | null }> {
  return use(DryRunContext) ? async () => ({ error: null }) : action;
}

export function useDryRun() {
  return use(DryRunContext);
}
