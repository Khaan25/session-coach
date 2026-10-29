"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import type { SessionSummary } from "@/lib/sessions/rows";
import { useLiveSessions } from "@/lib/sessions/use-live-sessions";

/**
 * Watches one pending or processing session over Realtime, as the dashboard does, and re-renders the page when its
 * status changes, so the cards or the failure appear without a reload. Renders nothing.
 */
export function RefreshOnSettle({ userId, session }: { userId: string; session: SessionSummary }) {
  const router = useRouter();
  const { rows } = useLiveSessions(userId, [session], { prepend: false });
  const status = rows[0]?.status;
  useEffect(() => {
    if (status && status !== session.status) router.refresh();
  }, [status, session.status, router]);
  return null;
}
