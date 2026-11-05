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
  repo,
  empty,
}: {
  sessions: SessionListItem[];
  userId: string;
  now: string;
  prepend: boolean;
  limit: number;
  /** The project the list is filtered to: only its new sessions join. */
  repo?: string;
  /** Shown while the list has no row; the plain "No sessions yet" by default. */
  empty?: React.ReactNode;
}) {
  const { rows, elapsedMs } = useLiveSessions(userId, sessions, { prepend, limit, repo });
  return (
    <SessionRows rows={rows} now={new Date(Date.parse(now) + (elapsedMs ?? 0))} empty={empty} />
  );
}

/** The rows as they are, with no live updates: what SessionList draws, for the skeleton and the canvas. */
export function SessionRows({
  rows,
  now,
  empty = <NoSessionsEmpty variant="plain" />,
}: {
  rows: SessionListItem[];
  now: Date;
  empty?: React.ReactNode;
}) {
  if (rows.length === 0) return empty;
  return (
    <ItemGroup>
      {rows.map((session) => (
        <SessionRow key={session.id} session={session} cardCount={session.cardCount} now={now} />
      ))}
    </ItemGroup>
  );
}
