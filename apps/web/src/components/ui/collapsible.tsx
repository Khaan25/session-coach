"use client";

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import { CaretRightIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import type { ReactNode } from "react";

// Shows and hides one region. The trigger stays unstyled so it can render as another part (the sidebar
// renders it as a SidebarMenuAction); CollapsibleRow is Quartz's styled trigger, with the caret that turns a
// quarter when open and an optional summary of what the closed region holds ("1 of 6 failed").
//
// The panel animates its height off Base UI's --collapsible-panel-height, so the content below slides
// instead of jumping. Quartz cuts the panel; here the motion wins, and it stops under reduced motion.

function Collapsible({ className, ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" className={className} {...props} />;
}

function CollapsibleTrigger({ ...props }: CollapsiblePrimitive.Trigger.Props) {
  return <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />;
}

type CollapsibleRowProps = CollapsiblePrimitive.Trigger.Props & {
  /** Hides the caret, for triggers that bring their own indicator. */
  caret?: boolean;
  /** row: a full-width 40px row in text-3, for the last row of a list in a frame. */
  size?: "sm" | "default" | "row";
  /** What the closed region holds, in a few words. Hidden while open. */
  summary?: ReactNode;
  /** The summary reports a problem: fail or warn text colour, instead of text-3. */
  summaryStatus?: "warn" | "fail";
};

function CollapsibleRow({
  className,
  children,
  caret = true,
  size = "default",
  summary,
  summaryStatus,
  ...props
}: CollapsibleRowProps) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      data-size={size}
      className={cn(
        "group/collapsible-trigger inline-flex max-w-full items-center gap-3 self-start rounded-soft px-2 text-start text-text-1",
        "transition-colors duration-(--dur-fast) ease-(--ease-step) hover:not-data-disabled:bg-hover focus-visible:focus-ring",
        "data-disabled:cursor-not-allowed data-disabled:text-text-disabled",
        "data-[size=default]:min-h-(--control) data-[size=default]:type-label",
        "data-[size=sm]:min-h-(--control-sm) data-[size=sm]:type-label-sm",
        "data-[size=row]:min-h-(--row) data-[size=row]:w-full data-[size=row]:max-w-none data-[size=row]:self-stretch data-[size=row]:px-3 data-[size=row]:type-label data-[size=row]:text-text-3",
        className,
      )}
      {...props}
    >
      {caret && (
        <CaretRightIcon
          aria-hidden
          data-slot="collapsible-caret"
          className="size-3 shrink-0 text-text-3 transition-transform duration-200 ease-out-quint group-data-panel-open/collapsible-trigger:rotate-90 motion-reduce:transition-none rtl:-scale-x-100 rtl:group-data-panel-open/collapsible-trigger:-rotate-90"
        />
      )}
      {children}
      {summary && (
        <span
          data-slot="collapsible-summary"
          data-status={summaryStatus}
          className={cn(
            "flex min-w-0 items-center gap-1.5 truncate type-label-sm data text-text-3 group-data-panel-open/collapsible-trigger:hidden",
            "data-[status=fail]:text-fail-text data-[status=warn]:text-warn-text",
          )}
        >
          {summary}
        </span>
      )}
    </CollapsiblePrimitive.Trigger>
  );
}

function CollapsibleContent({ className, ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      className={cn(
        "h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out-quint data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

export {
  Collapsible,
  CollapsibleContent,
  CollapsibleRow,
  CollapsibleTrigger,
  type CollapsibleRowProps,
};
