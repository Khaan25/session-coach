import {
  ArrowUpRightIcon,
  FileTextIcon,
  WarningCircleIcon,
  ClockIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react/ssr";
import type { Session } from "@session-coach/shared/session";
import Link from "next/link";
import { projectHref, type ProjectScope } from "@/lib/projects/scope";

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemLink,
  ItemMeta,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { formatRelativeTime } from "@/lib/relative-time";
import { sessionName } from "@/lib/sessions/name";
import { isEmptyReady } from "@/lib/sessions/status-label";

import { StatusBadge } from "./status-badge";

type SessionRowProps = {
  session: Pick<Session, "id" | "title" | "repo" | "branch" | "status" | "error" | "created_at">;
  /** Visible cards (hidden ones excluded). Shown once the session is ready. */
  cardCount?: number;
  /** The clock the relative time is measured from, passed in so render never reads it. */
  now: Date;
  scope?: ProjectScope;
  variant?: "row" | "card";
};

/**
 * One session in the dashboard list, for an ItemGroup: title (or repo and branch), repo, when, card count and the
 * status word. A ready row links to its cards; a failed row shows the pipeline's learner-readable error.
 */
export function SessionRow({
  session,
  cardCount,
  now,
  scope = "all",
  variant = "row",
}: SessionRowProps) {
  const { id, title, repo, branch, status, error, created_at } = session;
  const name = sessionName({ title, repo, branch });
  const when = formatRelativeTime(created_at, now);
  return (
    // ItemGroup is a div with role="list" (see ui/item.tsx), so the row takes the matching role, not an li.
    <Item
      size="session"
      variant={variant === "card" ? "session-card" : "default"}
      // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="listitem"
      data-status={status === "failed" ? "fail" : undefined}
      data-session-state={status}
    >
      <ItemMedia variant="session">
        {status === "failed" ? (
          <WarningCircleIcon weight="duotone" aria-hidden />
        ) : status === "pending" ? (
          <ClockIcon weight="duotone" aria-hidden />
        ) : status === "processing" ? (
          <CircleNotchIcon aria-hidden />
        ) : (
          <FileTextIcon weight="duotone" aria-hidden />
        )}
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          <ItemLink render={<Link href={projectHref("/s/" + id, scope)} />}>{name}</ItemLink>
        </ItemTitle>
        {status === "failed" ? (
          <ItemDescription>
            {error?.trim() || "We couldn’t prepare decisions. Open this session for details."}
          </ItemDescription>
        ) : (
          ((title && repo) || (status === "ready" && cardCount !== undefined && cardCount > 0)) && (
            <ItemDescription>
              {title && repo && <span className="type-code-sm">{repo}</span>}
              {status === "ready" &&
                cardCount !== undefined &&
                !isEmptyReady(status, cardCount) && (
                  <span className="session-decision-count">
                    {title && repo ? " · " : ""}
                    {cardCount} {cardCount === 1 ? "decision" : "decisions"}
                  </span>
                )}
            </ItemDescription>
          )
        )}
      </ItemContent>
      {when && (
        <ItemMeta>
          <time dateTime={created_at}>{when}</time>
        </ItemMeta>
      )}
      <StatusBadge status={status} cardCount={cardCount} />
      {status === "ready" && <ArrowUpRightIcon className="size-4 text-text-3" aria-hidden />}
    </Item>
  );
}
