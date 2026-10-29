import { Children, Fragment } from "react";
import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon } from "@phosphor-icons/react/ssr";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

import { Sparkline } from "@/components/ui/sparkline";
import type { Kind } from "@/lib/ui/kind";

// A number worth reading from across the room, with what it is and how it moved. The value is plain
// sans in tabular figures: 32px in the app, 40px for the one hero number on an app page, and 48px
// on marketing pages. The label sits above, so the number is read in context first. Tabular figures and
// a slashed zero keep a row of stats aligned.
//
// The delta works out its own sign. Give StatDelta the two numbers (`from` and `to`) and it writes the
// change, picks the arrow and adds the comparator ("vs 507"), so the arrow can never disagree with the
// figure and a number never shows without its baseline. Deltas are ink: a hue never says good or bad; the
// description says that in words. StatTrend adds the sparkline in the counted kind's hue.
//
// Two or more stats go in a StatGroup: one frame whose cells share its lines, side by side from 448px and stacked
// under it, never a row of separate cards. A lone stat with variant="framed" is the same cell in its own frame. A
// stat in trouble (status="warn" | "fail") keeps paper and its description turns to the warn or fail text; the
// description must say what is wrong in words.

const statVariants = cva("group/stat flex min-w-0 flex-col", {
  variants: {
    size: {
      default: "gap-2",
      lg: "gap-3",
      xl: "gap-4",
    },
    variant: {
      plain: "",
      framed: "frame bg-page px-4 py-3",
      /** @deprecated Use framed. */
      card: "frame bg-page px-4 py-3",
    },
  },
  defaultVariants: { size: "default", variant: "plain" },
});

type StatProps = React.ComponentProps<"div"> &
  VariantProps<typeof statVariants> & {
    /** Waiting for the number. The value keeps its height and the delta and trend hold their space. */
    loading?: boolean;
    /** The kind being counted. Colors the trend line; never the number. */
    kind?: Kind;
    /** The number is in trouble: the description takes the warn or fail text step. The cell stays paper. */
    status?: "warn" | "fail";
  };

function Stat({
  className,
  size = "default",
  variant = "plain",
  loading,
  kind,
  status,
  ...props
}: StatProps) {
  return (
    <div
      data-slot="stat"
      data-size={size}
      data-variant={variant === "card" ? "framed" : variant}
      data-kind={kind}
      data-status={status}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      className={cn(statVariants({ size, variant }), className)}
      {...props}
    />
  );
}

type StatGroupProps = React.ComponentProps<"div"> & {
  /** The kind the whole strip counts: sets data-kind on the strip so every Stat's trend takes it. */
  kind?: Kind;
  /** framed: the strip's own frame. plain: no edge, for a strip inside another frame, which draws only the rules. `frame` is a @deprecated alias of framed. */
  variant?: "framed" | "plain" | "frame";
};

/**
 * Two or more stats as one frame whose cells share its lines: side by side, split by the column rule, from 448px,
 * and stacked, split by the row rule, under it. Each Stat inside is a cell with 16px by 12px padding.
 */
function StatGroup({ kind, variant = "framed", className, children, ...props }: StatGroupProps) {
  return (
    <div
      data-slot="stat-group"
      data-kind={kind}
      className={cn("@container/stats min-w-0", variant !== "plain" && "frame bg-page", className)}
      {...props}
    >
      <div className="grid grid-cols-1 @md/stats:auto-cols-fr @md/stats:grid-flow-col [&>*]:px-4 [&>*]:py-3 [&>*+*]:rule-top @md/stats:[&>*+*]:rule-col">
        {children}
      </div>
    </div>
  );
}

function StatLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="stat-label" className={cn("type-label text-text-2", className)} {...props} />
  );
}

/**
 * Breaks a figure only after a separator. "12,480,991,204" becomes the groups "12," "480," "991," "204",
 * each kept whole, with a break point after each, so a narrow box wraps between groups and never inside
 * one.
 */
function groupsOf(text: string) {
  return text.split(/(?<=[,.\s])/).map((part, i) => (
    <Fragment key={i}>
      <span className="whitespace-nowrap">{part}</span>
      <wbr />
    </Fragment>
  ));
}

function StatValue({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-value"
      className={cn(
        "flex min-w-0 flex-wrap items-baseline gap-x-1 type-stat data text-text-1 group-data-[size=lg]/stat:type-stat-lg group-data-[size=xl]/stat:type-stat-xl",
        className,
      )}
      {...props}
    >
      <span className="contents group-data-[loading]/stat:hidden">
        {Children.map(children, (child) =>
          typeof child === "string" || typeof child === "number" ? (
            <span className="min-w-0 [overflow-wrap:normal]">{groupsOf(String(child))}</span>
          ) : (
            child
          ),
        )}
      </span>
      <span
        aria-hidden
        className="hidden h-(--line-box) w-(--stat-placeholder) bg-(--surface-skeleton) group-data-[loading]/stat:block"
      />
    </div>
  );
}

/** A unit after the value, in the sans at label size: "s", "ms", "req/min". */
function StatUnit({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="stat-unit"
      className={cn(
        "ms-0.5 type-label text-text-2 group-data-[size=lg]/stat:type-body-lg group-data-[size=xl]/stat:type-heading-sm",
        className,
      )}
      {...props}
    />
  );
}

type Trend = "up" | "down" | "flat";
const trendIcon = { up: ArrowUpRightIcon, down: ArrowDownRightIcon, flat: ArrowRightIcon };
const trendWord = { up: "Up", down: "Down", flat: "No change" };

const plain = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });

/** Works out the trend and the change between two numbers. Under 0.05% counts as flat. */
function deltaOf(from: number, to: number) {
  const diff = to - from;
  const pct = from === 0 ? (to === 0 ? 0 : Infinity) : (diff / Math.abs(from)) * 100;
  const trend: Trend = !Number.isFinite(pct)
    ? diff > 0
      ? "up"
      : "down"
    : Math.abs(pct) < 0.05
      ? "flat"
      : pct > 0
        ? "up"
        : "down";
  const change = !Number.isFinite(pct)
    ? "new"
    : trend === "flat"
      ? "0%"
      : `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
  return { trend, change };
}

type StatDeltaProps = React.ComponentProps<"div"> & {
  /** Set the arrow by hand. Leave it out and pass `from` and `to` to have it worked out. */
  trend?: Trend;
  /** The baseline: last period's number. With `to`, the delta writes its own change and comparator. */
  from?: number;
  /** This period's number. */
  to?: number;
  /** Formats the baseline in the comparator: "vs $1,204". Plain numbers by default. */
  format?: (n: number) => string;
  /** The words after the baseline: "vs 507 last week" with period="last week". */
  period?: string;
};

/** The change since the last period. Ink with an arrow; the words say whether that is good. */
function StatDelta({
  trend: given,
  from,
  to,
  format = plain,
  period,
  className,
  children,
  ...props
}: StatDeltaProps) {
  // A NaN or Infinity has no change to state: no arrow and no "NaN%".
  const known =
    from !== undefined && to !== undefined && Number.isFinite(from) && Number.isFinite(to);
  // Half a pair (only from, or only to) has no change either.
  if (!known && (from !== undefined || to !== undefined) && children === undefined) return null;
  const computed = known ? deltaOf(from, to) : undefined;
  const trend = given ?? computed?.trend ?? "flat";
  // 0 to 0 says nothing: no arrow, no "0% vs 0".
  if (computed && from === 0 && to === 0 && children === undefined) return null;
  const Arrow = trendIcon[trend];
  return (
    <div
      data-slot="stat-delta"
      data-trend={trend}
      className={cn(
        "relative inline-flex min-w-0 flex-wrap items-center gap-x-1 type-label-sm text-text-2 group-data-[loading]/stat:invisible",
        className,
      )}
      {...props}
    >
      <Arrow aria-hidden className="size-3 rtl:-scale-x-100" />
      <span className="sr-only">{trendWord[trend]}</span>
      <span className="data">{children ?? computed?.change}</span>
      {computed && (
        <span data-slot="stat-baseline" className="text-text-3">
          vs <span className="data">{format(from!)}</span>
          {period && ` ${period}`}
        </span>
      )}
    </div>
  );
}

function StatDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="stat-description"
      className={cn(
        "type-body-sm text-text-3 group-data-[status=fail]/stat:text-fail-text group-data-[status=warn]/stat:text-warn-text",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The sparkline beside the value, in the kind's line. Pass values oldest first. A screen reader gets one
 * sentence ("Runs per day: up from 412 to 549, low 401, high 549") instead of the ten-row table behind the
 * drawing, so a row of four stats does not read 40 table rows between labels and values.
 */
function StatTrend({
  data,
  labels,
  label = "Trend",
  className,
}: {
  data: (number | null)[];
  labels?: string[];
  label?: string;
  className?: string;
}) {
  if (data.length < 2) return null;
  const values = data.filter((v): v is number => v !== null && Number.isFinite(v));
  const f = (v: number) => v.toLocaleString("en-US");
  const first = values[0],
    last = values[values.length - 1];
  const words = values.length
    ? `${last > first ? "up" : last < first ? "down" : "flat"} from ${f(first)} to ${f(last)}, low ${f(Math.min(...values))}, high ${f(Math.max(...values))}`
    : "no data";
  return (
    <div
      data-slot="stat-trend"
      role="img"
      aria-label={`${label}: ${words}`}
      className={cn(
        "mb-1 block w-24 min-w-10 shrink group-data-[loading]/stat:invisible",
        className,
      )}
    >
      <div aria-hidden="true">
        <Sparkline data={data} labels={labels} label={label} size="lg" area className="w-full" />
      </div>
    </div>
  );
}

/** A row in the card: the value, then the trend pushed to the end. */
function StatRow({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-row"
      className={cn("flex min-w-0 items-end justify-between gap-4", className)}
      {...props}
    />
  );
}

export {
  Stat,
  StatGroup,
  StatLabel,
  StatValue,
  StatUnit,
  StatDelta,
  StatDescription,
  StatTrend,
  StatRow,
  statVariants,
  deltaOf,
  type StatGroupProps,
  type StatProps,
  type Trend,
};
