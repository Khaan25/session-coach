"use client";

import { useLinkStatus } from "next/link";

/** A reserved indicator confirms navigation without shifting the link’s label. */
export function NavigationFeedback() {
  const { pending } = useLinkStatus();
  return <span className="navigation-pending" data-pending={pending || undefined} aria-hidden />;
}
