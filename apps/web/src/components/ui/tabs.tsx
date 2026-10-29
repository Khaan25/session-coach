"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

// Panels of one view. Quartz's skin on the zip's motion. Two looks:
//   default  a grey track with the active tab as a lifted paper thumb (Quartz's segmented look)
//   line     text on the page over a row rule, with a 2px ink line under the active tab

/*
 * A grid rather than a flex column, so every panel can be placed in the same cell.
 *
 * That overlap is what makes the panel transition possible at all. Base UI keeps the outgoing panel
 * mounted until its exit transition ends, so for one frame either side of a tab change there are two
 * panels in the tree; stacked in a flex column they would briefly double the height of whatever
 * contains them. Sharing one cell, the taller of the two sizes the row and nothing moves.
 */
function Tabs({ className, orientation = "horizontal", ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs grid max-w-full min-w-0 gap-3 data-horizontal:grid-cols-1 data-horizontal:grid-rows-[auto_1fr] data-vertical:grid-cols-[auto_1fr] data-vertical:grid-rows-1",
        className,
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "group/tabs-list relative inline-flex w-fit max-w-full items-center justify-center text-text-2 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col group-data-vertical/tabs:items-stretch",
  {
    variants: {
      variant: {
        default:
          "gap-0.5 rounded-soft bg-well p-0.5 group-data-horizontal/tabs:h-(--control) data-[size=sm]:group-data-horizontal/tabs:h-(--control-sm) forced-colors:border forced-colors:border-solid forced-colors:border-[CanvasText]",
        line: "gap-1 rounded-none bg-transparent group-data-horizontal/tabs:min-h-(--control) group-data-horizontal/tabs:shadow-[inset_0_-1px_0_var(--line-row)] group-data-vertical/tabs:shadow-[inset_-1px_0_0_var(--line-row)] rtl:group-data-vertical/tabs:shadow-[inset_1px_0_0_var(--line-row)]",
      },
      size: {
        default: "",
        sm: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/*
 * The list renders its own indicator, so every Tabs gets the sliding highlight without the caller
 * composing one. It is appended after `children` rather than exported as a part because there is no
 * correct second place to put it: it is positioned against the list, and one list has exactly one
 * active tab.
 */
function TabsList({
  className,
  variant = "default",
  size = "default",
  children,
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      data-size={size}
      className={cn(tabsListVariants({ variant, size }), className)}
      {...props}
    >
      {children}
      <TabsIndicator />
    </TabsPrimitive.List>
  );
}

/*
 * The highlight behind the active tab, moved off the trigger so it can travel between them instead of
 * cross-fading in place.
 *
 * Base UI measures the active tab and publishes `--active-tab-*` on this element; animating `translate`
 * and `width` off those is what produces the slide. It renders `hidden` until the first measurement
 * lands, so there is no frame where an unpositioned box sits at the start of the list.
 *
 * Physical `translate-x`/`translate-y` on purpose: the offsets Base UI reports are physical distances
 * from the list's own box, so they are already correct under RTL and a logical property would flip them
 * a second time.
 */
function TabsIndicator({ className, ...props }: TabsPrimitive.Indicator.Props) {
  return (
    <TabsPrimitive.Indicator
      data-slot="tabs-indicator"
      className={cn(
        "pointer-events-none absolute top-0 left-0 z-0 h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) translate-y-(--active-tab-top) transition-[translate,width,height] duration-200 ease-in-out-quint motion-reduce:transition-none",
        // default: Quartz's segmented thumb, a lifted paper box on the grey track.
        "rounded-inner bg-(--surface-thumb) shadow-(--elev-thumb) forced-colors:bg-[Highlight]",
        // The line variant draws a 2px ink line under the tab instead of a thumb behind it.
        "group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:shadow-none group-data-[variant=line]/tabs-list:after:absolute group-data-[variant=line]/tabs-list:after:bg-ink group-data-horizontal/tabs:group-data-[variant=line]/tabs-list:after:inset-x-0 group-data-horizontal/tabs:group-data-[variant=line]/tabs-list:after:bottom-0 group-data-horizontal/tabs:group-data-[variant=line]/tabs-list:after:h-(--line-accent) group-data-vertical/tabs:group-data-[variant=line]/tabs-list:after:inset-y-0 group-data-vertical/tabs:group-data-[variant=line]/tabs-list:after:end-0 group-data-vertical/tabs:group-data-[variant=line]/tabs-list:after:w-(--line-accent) forced-colors:group-data-[variant=line]/tabs-list:after:bg-[Highlight]",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative z-1 inline-flex h-full flex-1 items-center justify-center gap-1.5 rounded-inner bg-transparent px-3 type-label whitespace-nowrap text-text-2 transition-colors select-none",
        "group-data-[size=sm]/tabs-list:px-2.5 group-data-[size=sm]/tabs-list:type-label-sm group-data-[variant=line]/tabs-list:px-2",
        "group-data-vertical/tabs:min-h-(--control-sm) group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start",
        "hover:not-data-disabled:text-text-1 focus-visible:focus-ring-inset",
        "aria-disabled:pointer-events-none aria-disabled:text-text-disabled data-disabled:cursor-not-allowed data-disabled:text-text-disabled",
        "has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // Only the colour is the trigger's: the thumb and the line are TabsIndicator's, so they can travel. `z-1`
        // keeps the label above it; the indicator sits at `z-0`.
        "data-active:text-text-1 forced-colors:data-active:text-[HighlightText]",
        className,
      )}
      {...props}
    />
  );
}

/*
 * Panels share one grid cell (see `Tabs`) and cross-fade with a short shift in the direction the tab
 * moved, which Base UI reports as `data-activation-direction`.
 *
 * The shift is 8px rather than a half-panel slide: there is no `overflow-hidden` wrapper to clip
 * against, so a large translate would paint outside whatever card it sits in for the length of the
 * transition. 8px reads as the same gesture and stays inside its own bounds.
 *
 * `motion-safe` guards the movement only. The opacity change still runs under reduced motion, because
 * without it the outgoing panel would vanish abruptly.
 */
function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(
        "col-start-1 min-w-0 flex-1 rounded-soft type-body text-text-1 outline-none group-data-horizontal/tabs:row-start-2 group-data-vertical/tabs:col-start-2 group-data-vertical/tabs:row-start-1 focus-visible:focus-ring",
        "transition-[opacity,translate] duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0",
        "motion-safe:data-ending-style:data-[activation-direction=left]:translate-x-2 motion-safe:data-starting-style:data-[activation-direction=left]:-translate-x-2 motion-safe:data-ending-style:data-[activation-direction=right]:-translate-x-2 motion-safe:data-starting-style:data-[activation-direction=right]:translate-x-2",
        "motion-safe:data-ending-style:data-[activation-direction=down]:-translate-y-2 motion-safe:data-starting-style:data-[activation-direction=down]:translate-y-2 motion-safe:data-ending-style:data-[activation-direction=up]:translate-y-2 motion-safe:data-starting-style:data-[activation-direction=up]:-translate-y-2",
        className,
      )}
      {...props}
    />
  );
}

/** A small count after a tab label, in tabular figures. */
function TabsCount({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="tabs-count"
      className={cn("type-label-sm data text-text-3", className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsCount, TabsIndicator, TabsList, tabsListVariants, TabsTrigger };
