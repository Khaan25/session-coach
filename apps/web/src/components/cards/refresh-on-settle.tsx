"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import type { SessionSummary } from "@/lib/sessions/rows";
import { useLiveSessions } from "@/lib/sessions/use-live-sessions";

/**
 * Watches one pending or processing session over Realtime, as the dashboard does, and re-renders the page when its
 * status changes, so the cards or the failure appear without a reload. Renders nothing.
 */
export function RefreshOnSettle({ userId, session }: { userId: string; session: SessionSummary }) {
  const router = useRouter();
  // Memoized: useLiveSessions starts again from new rows, so a fresh array each render would loop.
  const initial = useMemo(() => [session], [session]);
  const { rows } = useLiveSessions(userId, initial, { prepend: false });
  const status = rows[0]?.status;
  useEffect(() => {
    if (status && status !== session.status) router.refresh();
  }, [status, session.status, router]);
  return null;
}
