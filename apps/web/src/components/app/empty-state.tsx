import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import {
  CalendarCheckIcon,
  ChartLineUpIcon,
  MagnifyingGlassIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react/ssr";

import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyQuery,
  EmptyTitle,
} from "@/components/ui/empty";

type EmptyStateProps = {
  /** A Phosphor icon, drawn duotone at 16px before the title. Leave it out more often than not. */
  icon?: Icon;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** One action that gets the person out of the empty state, and at most one quieter one. */
  action?: React.ReactNode;
  /** no-results: a search or filter emptied the list. */
  reason?: "empty" | "no-results";
  /** plain inside a Card, table or list frame; framed (default) when it stands alone. */
  variant?: "framed" | "plain";
};

/** A region with nothing to show yet: top-left where the first row would be, a title, one muted line, the action. */
export function EmptyState({
  icon: IconGlyph,
  title,
  description,
  action,
  reason = "empty",
  variant,
}: EmptyStateProps) {
  return (
    <Empty reason={reason} variant={variant}>
      <EmptyHeader>
        {IconGlyph && (
          <EmptyMedia>
            <IconGlyph weight="duotone" />
          </EmptyMedia>
        )}
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}

type PresetProps = Pick<EmptyStateProps, "variant">;

/** Dashboard with no sessions: the CLI isn't set up, or no session has ended since. */
export function NoSessionsEmpty({ variant }: PresetProps) {
  return (
    <EmptyState
      variant={variant}
      icon={TerminalWindowIcon}
      title="No sessions yet"
      description="Your sessions appear here once the CLI is set up. Each session becomes 3 to 5 decision cards, and you explain them back on day 1, 3 and 7."
      action={
        <Link href="/setup" className={buttonVariants()}>
          Set up the CLI
        </Link>
      }
    />
  );
}

/** Review queue with nothing due today. */
export function NoCardsDueEmpty({ variant }: PresetProps) {
  return (
    <EmptyState
      variant={variant}
      icon={CalendarCheckIcon}
      title="No cards due today"
      description="Each card comes back on day 1, 3 and 7 after its session. New cards arrive when your next session ends."
    />
  );
}

/** Progress view before the first answer. */
export function NoReviewsEmpty({ variant }: PresetProps) {
  return (
    <EmptyState
      variant={variant}
      icon={ChartLineUpIcon}
      title="No reviews yet"
      description="Your progress shows here after you explain back your first card."
      action={
        <Link href="/review" className={buttonVariants({ variant: "secondary" })}>
          Open the review queue
        </Link>
      }
    />
  );
}

/** A search or filter that matched nothing. The query is written back in the title. */
export function NoResultsEmpty({
  query,
  noun = "sessions",
  action,
  variant = "plain",
}: PresetProps & { query: string; noun?: string; action?: React.ReactNode }) {
  return (
    <EmptyState
      variant={variant}
      reason="no-results"
      icon={MagnifyingGlassIcon}
      title={
        <>
          No {noun} match <EmptyQuery>{query}</EmptyQuery>
        </>
      }
      // TODO(zia): name the fields search reads (title, repo, branch?) once the search exists.
      description="Check the spelling, or try a shorter search."
      action={action}
    />
  );
}
