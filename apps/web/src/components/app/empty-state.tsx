import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import {
  CalendarCheckIcon,
  CardsIcon,
  ChartLineUpIcon,
  MagnifyingGlassIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react/ssr";

import { Sprite, type SpriteName } from "@/components/art/sprite";
import { buttonVariants } from "@/components/ui/button";
import type { Cardless } from "@/lib/sessions/queries";
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
  /** A small watercolour object in the bottom-right corner, from lg up (the sidebar crowds it below). Decorative; the text never sits under it. */
  sprite?: SpriteName;
};

/** A region with nothing to show yet: top-left where the first row would be, a title, one muted line, the action. */
export function EmptyState({
  icon: IconGlyph,
  title,
  description,
  action,
  reason = "empty",
  variant,
  sprite,
}: EmptyStateProps) {
  return (
    <Empty reason={reason} variant={variant} className="relative">
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
      {sprite && (
        <Sprite name={sprite} className="absolute right-4 bottom-4 hidden w-20 lg:block" />
      )}
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
      sprite="pencil"
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

/** The copy and the way out for each reason a learner has no card; the failed session's link is filled in below. */
const cardlessCopy = {
  "no-sessions": {
    title: "No cards yet",
    description:
      "Cards come from your Claude Code sessions. Set up the CLI, and each session that ends becomes 3 to 5 cards to explain back.",
    action: { href: "/setup", label: "Set up the CLI", variant: "default" },
  },
  processing: {
    title: "Cards on the way",
    description: "Your latest session is still being read. Its cards appear here once it's ready.",
    action: { href: "/dashboard", label: "See your sessions", variant: "secondary" },
  },
  failed: {
    title: "No cards yet",
    description: "Cards couldn't be made from your latest session. Open it to see why.",
    action: { href: "/dashboard", label: "Open the session", variant: "secondary" },
  },
  "no-cards": {
    title: "No cards yet",
    description:
      "Your sessions so far gave no cards: each card needs an exact quote from its session to back it. Sessions where you talk through options give the most.",
    action: { href: "/dashboard", label: "See your sessions", variant: "secondary" },
  },
} as const;

/**
 * A card screen (review queue, progress) for a learner with no visible card. `cardless` (from `cardlessReason`) picks
 * the way forward: set up the CLI, wait for the session being read, open the session that failed, or look at the
 * sessions that gave none. Leave it out for a first run.
 */
export function NoCardsYetEmpty({
  cardless = { reason: "no-sessions" },
  variant,
}: PresetProps & { cardless?: Cardless }) {
  const { title, description, action } = cardlessCopy[cardless.reason];
  const href = cardless.reason === "failed" ? `/s/${cardless.sessionId}` : action.href;
  return (
    <EmptyState
      variant={variant}
      icon={CardsIcon}
      sprite="pencil"
      title={title}
      description={description}
      action={
        <Link href={href} className={buttonVariants({ variant: action.variant })}>
          {action.label}
        </Link>
      }
    />
  );
}

/**
 * All done: the learner has cards, but none is due today. `next` is when the next one is due, in words ("tomorrow",
 * "on Thursday 5 November"); leave it out when nothing is scheduled. Then the way out is the sessions: a card never
 * answered within 7 days leaves the queue but stays on its session's page.
 */
export function AllCaughtUpEmpty({ next, variant }: PresetProps & { next?: string }) {
  return (
    <EmptyState
      variant={variant}
      icon={CalendarCheckIcon}
      sprite="tea"
      title="All caught up"
      description={
        next
          ? `Nothing is due today. Your next card is due ${next}, and new cards arrive when your next session ends.`
          : "Nothing is due today, and no review is scheduled. A card you didn't answer within 7 days of its session stays on that session's page."
      }
      action={
        next ? (
          <Link href="/progress" className={buttonVariants({ variant: "secondary" })}>
            See your progress
          </Link>
        ) : (
          <Link href="/dashboard" className={buttonVariants({ variant: "secondary" })}>
            See your sessions
          </Link>
        )
      }
    />
  );
}

/** The review queue once the day's cards are done (`DAILY_CAP` in lib/review/today.ts), with cards still waiting. */
export function DoneForTodayEmpty({ cap, variant }: PresetProps & { cap: number }) {
  return (
    <EmptyState
      variant={variant}
      icon={CalendarCheckIcon}
      sprite="tea"
      title="Done for today"
      description={`You've done ${cap} cards today. The rest come back tomorrow.`}
      action={
        <Link href="/progress" className={buttonVariants({ variant: "secondary" })}>
          See your progress
        </Link>
      }
    />
  );
}

/** Progress view before the first answer. */
export function NoReviewsEmpty({ variant }: PresetProps) {
  return (
    <EmptyState
      variant={variant}
      icon={ChartLineUpIcon}
      sprite="plant"
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
