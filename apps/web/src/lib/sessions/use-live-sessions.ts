"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { sessionName } from "@/lib/sessions/name";
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

import { applySessionChange, toSummary, type SessionListItem } from "./rows";

// `${id}:${status}` already toasted (or already settled on first render), shared by every mounted list, so the
// dashboard and the sidebar never toast the same change twice.
const announced = new Set<string>();

/**
 * The learner's sessions kept current by Realtime: inserts are prepended (when `prepend`), updates change the row in
 * place, and a session that settles on ready or failed raises one toast. Unsubscribes on unmount.
 *
 * @param userId - The signed-in learner; null skips the subscription.
 * @param initial - The server-rendered rows.
 * @param options.prepend - Whether new sessions join this list (page 1 and the sidebar, not older pages).
 * @param options.limit - The most rows the list keeps: a page's size, or the sidebar's 5.
 * @returns The live rows, and how long after the server's rows arrived the last change came (null before one), so
 *   relative times can be measured on the server's clock.
 */
export function useLiveSessions(
  userId: string | null | undefined,
  initial: SessionListItem[],
  { prepend = true, limit = Infinity }: { prepend?: boolean; limit?: number } = {},
) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  // The layout keeps the sidebar mounted, so a server refresh arrives as new rows: start again from them.
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setRows(initial);
    setElapsedMs(null);
  }
  const receivedAt = useRef(0);
  const channelId = useId();

  useEffect(() => {
    receivedAt.current = Date.now();
    for (const { id, status } of initial) announced.add(`${id}:${status}`);
  }, [initial]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    // Realtime joins with whatever token the socket has when subscribe() runs. The browser client loads the session
    // from cookies asynchronously, so subscribing straight away joins as anon and RLS filters out every event.
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let joined = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      channel = supabase
        // One channel per mounted list (useId): the dashboard and the sidebar subscribe side by side.
        .channel(`sessions:${userId}:${channelId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "sessions", filter: `user_id=eq.${userId}` },
          (payload) => {
            if (payload.eventType === "DELETE") return;
            const row = toSummary(payload.new);
            setElapsedMs(Date.now() - receivedAt.current);
            setRows((current) => applySessionChange(current, row, { prepend, limit }));
            if (row.status === "ready") {
              // The payload has no card count: count the visible cards (RLS hides hidden ones).
              void supabase
                .from("decision_cards")
                .select("id", { count: "exact", head: true })
                .eq("session_id", row.id)
                .then(({ count }) => {
                  if (count === null) return;
                  setRows((current) =>
                    current.map((r) => (r.id === row.id ? { ...r, cardCount: count } : r)),
                  );
                });
            }
            const key = `${row.id}:${row.status}`;
            if ((row.status === "ready" || row.status === "failed") && !announced.has(key)) {
              announced.add(key);
              const name = sessionName(row);
              toast.add(
                row.status === "ready"
                  ? { type: "success", title: "Cards ready", description: name }
                  : {
                      type: "error",
                      title: "Couldn't make cards",
                      description: row.error ?? name,
                    },
              );
            }
          },
        )
        // shortcut: a change between the server render and the first join is missed until the next navigation;
        // refresh on the first join too if that shows up in practice.
        .subscribe((status, error) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
            console.error("useLiveSessions: subscribe", status, error);
          // A rejoin after a dropped connection may have missed changes: re-read the rows through the server.
          if (status === "SUBSCRIBED" && joined) router.refresh();
          if (status === "SUBSCRIBED") joined = true;
        });
    });
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, channelId, prepend, limit, router]);

  return { rows, elapsedMs };
}
