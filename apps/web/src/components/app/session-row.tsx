import type { Session } from "@session-coach/shared/session";

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemLink,
  ItemMeta,
  ItemTitle,
} from "@/components/ui/item";
import { formatRelativeTime } from "@/lib/relative-time";
import { sessionName } from "@/lib/sessions/name";

import { StatusBadge } from "./status-badge";

type SessionRowProps = {
  session: Pick<Session, "id" | "title" | "repo" | "branch" | "status" | "error" | "created_at">;
  /** Visible cards (hidden ones excluded). Shown once the session is ready. */
  cardCount?: number;
  /** The clock the relative time is measured from, passed in so render never reads it. */
  now: Date;
};

/**
 * One session in the dashboard list, for an ItemGroup: title (or repo and branch), repo, when, card count and the
 * status word. A ready row links to its cards; a failed row shows the pipeline's learner-readable error.
 */
export function SessionRow({ session, cardCount, now }: SessionRowProps) {
  const { id, title, repo, branch, status, error, created_at } = session;
  const name = sessionName({ title, repo, branch });
  const when = formatRelativeTime(created_at, now);
  // shortcut: ItemLink is a plain <a> (no client-side navigation); give ItemLink a render prop to take next/link.
  return (
    // ItemGroup is a div with role="list" (see ui/item.tsx), so the row takes the matching role, not an li.
    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
    <Item role="listitem" data-status={status === "failed" ? "fail" : undefined}>
      <ItemContent>
        <ItemTitle>
          {status === "ready" ? <ItemLink href={`/s/${id}`}>{name}</ItemLink> : <span>{name}</span>}
        </ItemTitle>
        {status === "failed" ? (
          <ItemDescription>{error ?? "Couldn't make cards from this session."}</ItemDescription>
        ) : (
          title &&
          repo && (
            <ItemDescription>
              <span className="type-code-sm">{repo}</span>
            </ItemDescription>
          )
        )}
      </ItemContent>
      {status === "ready" && cardCount !== undefined && (
        <ItemMeta>
          {cardCount} {cardCount === 1 ? "card" : "cards"}
        </ItemMeta>
      )}
      {when && (
        <ItemMeta>
          <time dateTime={created_at}>{when}</time>
        </ItemMeta>
      )}
      <StatusBadge status={status} />
    </Item>
  );
}
