"use client";

import { NoSessionsEmpty } from "@/components/app/empty-state";
import { SessionRow } from "@/components/app/session-row";
import { ItemGroup } from "@/components/ui/item";
import type { SessionListItem } from "@/lib/sessions/rows";
import { useLiveSessions } from "@/lib/sessions/use-live-sessions";

/**
 * The dashboard's session list, live: Realtime updates each row's status in place and, on page 1, prepends new
 * sessions. `now` is the server's render time, so the first render matches the server's relative times, and later
 * changes move it on by the time elapsed in the browser rather than by the browser's own clock, which may be wrong.
 */
export function SessionList({
  sessions,
  userId,
  now,
  prepend,
  limit,
}: {
  sessions: SessionListItem[];
  userId: string;
  now: string;
  prepend: boolean;
  limit: number;
}) {
  const { rows, elapsedMs } = useLiveSessions(userId, sessions, { prepend, limit });
  if (rows.length === 0) return <NoSessionsEmpty variant="plain" />;
  const clock = new Date(Date.parse(now) + (elapsedMs ?? 0));
  return (
    <ItemGroup>
      {rows.map((session) => (
        <SessionRow key={session.id} session={session} cardCount={session.cardCount} now={clock} />
      ))}
    </ItemGroup>
  );
}
