import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import * as React from "react";

import { Separator } from "@/components/ui/separator";
import type { Kind } from "@/lib/ui/kind";

// The design system's list row: media, a title and a description, then meta and actions on one line. Rows live in an
// ItemGroup, the one frame, split by row rules. Rendered as a link or a button a row takes the hover wash;
// selected takes the kind's wash. The row gives up its meta first as it narrows (a container query on the row),
// and the name truncates last.

function ItemGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      /*
       * A div, and it has to stay one: `Item` renders a div, so a native `ul` here would be a list whose
       * children are not `li`. The role puts the semantics back without inventing the wrong element.
       */
      // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="list"
      data-slot="item-group"
      className={cn(
        "group/item-group frame relative flex w-full flex-col overflow-hidden bg-page",
        // In a card, the list is the design system's panel inset: a white panel 4px inside the grey card, its
        // corners nested in the card's (10px less the 4px gap).
        "has-[>[data-variant=outline]]:gap-2 has-[>[data-variant=outline]]:overflow-visible has-[>[data-variant=outline]]:bg-transparent has-[>[data-variant=outline]]:before:hidden",
        "in-data-[slot=card]:mx-1 in-data-[slot=card]:mb-1 in-data-[slot=card]:w-auto in-data-[slot=card]:[--frame-radius:calc(var(--radius-frame)-4px)]",
        className,
      )}
      {...props}
    />
  );
}

function ItemSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="item-separator"
      orientation="horizontal"
      // Rows in a group already draw their own rule; a separator there would double it.
      className={cn("in-data-[slot=item-group]:hidden", className)}
      {...props}
    />
  );
}

const itemVariants = cva(
  [
    "group/item @container/item relative flex w-full min-w-0 flex-wrap items-center text-start text-text-1 outline-none",
    "transition-colors duration-100 focus-visible:focus-ring-inset [a]:transition-colors",
    // In a group or a card: a row split from the next by a row rule; the frame clips the corners.
    "in-data-[slot=card]:rounded-none in-data-[slot=card]:rule-row in-data-[slot=item-group]:rounded-none in-data-[slot=item-group]:rule-row",
    // Hover never greys a selected row: the wash stays.
    "[a]:not-data-selected:not-aria-selected:hover:bg-hover [a]:active:bg-pressed [button]:not-data-selected:not-aria-selected:hover:bg-hover [button]:active:bg-pressed",
    "has-[[data-slot=item-link]:active]:bg-pressed not-data-selected:not-aria-selected:has-[[data-slot=item-link]:hover]:bg-hover",
    "aria-selected:bg-accent-wash data-selected:bg-accent-wash",
    "data-[status=fail]:wash-row",
    "forced-colors:data-selected:outline forced-colors:data-selected:outline-2 forced-colors:data-selected:-outline-offset-2",
  ],
  {
    variants: {
      variant: {
        default: "rounded-soft bg-transparent",
        // In a group, outline rows stand apart as framed rows (the group drops its own frame), so no edge doubles.
        outline:
          "frame in-data-[slot=item-group]:rounded-soft! in-data-[slot=item-group]:shadow-none!",
        // The grey well: quieter rows that read as a set, inside a group too.
        muted: "rounded-soft bg-well",
      },
      // --row (40px) for one line, --row-lg (56px) with a description, --row-sm (32px) and 28px for dense lists.
      size: {
        default:
          "min-h-(--row) gap-x-3 gap-y-1 px-4 py-2 has-data-[slot=item-description]:min-h-(--row-lg)",
        sm: "min-h-(--row-sm) gap-x-3 gap-y-1 px-4 py-1.5",
        xs: "min-h-(--control-sm) gap-x-3 px-4 py-1 in-data-[slot=dropdown-menu-content]:p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type ItemProps = useRender.ComponentProps<"div"> &
  VariantProps<typeof itemVariants> & {
    /** The selected item in a list. Takes the kind's wash. */
    selected?: boolean;
    /** The kind of thing the row is. Sets data-kind, so selection takes that wash. */
    kind?: Kind;
  };

function Item({
  className,
  variant = "default",
  size = "default",
  selected,
  kind,
  render,
  ...props
}: ItemProps) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      { className: cn(itemVariants({ variant, size }), className) },
      {
        "data-slot": "item",
        "data-size": size,
        "data-variant": variant,
        "data-kind": kind,
        "data-selected": selected ? "" : undefined,
        "aria-current": selected && render ? "true" : undefined,
      } as React.ComponentProps<"div">,
      props,
    ),
    render,
    state: { slot: "item", variant, size },
  });
}

const itemMediaVariants = cva(
  "flex shrink-0 items-center justify-center gap-2 group-has-data-[slot=item-description]/item:self-start [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: "rounded-soft bg-transparent",
        icon: "size-8 text-text-2 group-data-[size=xs]/item:h-6 [&_svg:not([class*='size-'])]:size-4",
        image:
          "size-10 overflow-hidden rounded-soft group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 [&_img]:size-full [&_img]:object-cover",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

/** The lead: an avatar, an icon or an image. A kind goes in the title row as a Badge, never here. */
function ItemMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof itemMediaVariants>) {
  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      className={cn(itemMediaVariants({ variant, className }))}
      {...props}
    />
  );
}

function ItemContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-content"
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-0.5 [&+[data-slot=item-content]]:flex-none",
        className,
      )}
      {...props}
    />
  );
}

/** The name, then an optional ID. Under 384px of content width the ID goes; the name truncates last. */
function ItemTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-title"
      className={cn(
        "flex w-fit max-w-full min-w-0 items-baseline gap-2 overflow-hidden type-label underline-offset-4 [&>*:first-child]:min-w-0 [&>*:first-child]:truncate @max-sm/item:[&>*:not(:first-child):not([data-slot=badge])]:hidden",
        className,
      )}
      {...props}
    />
  );
}

function ItemDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="item-description"
      className={cn(
        "line-clamp-2 text-start type-body-sm text-pretty text-text-2 group-data-[size=xs]/item:line-clamp-1 [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-text-1",
        className,
      )}
      {...props}
    />
  );
}

/** A time, an owner, a count. The first thing the row drops: hidden under 576px of content width. */
function ItemMeta({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-meta"
      className={cn("shrink-0 data type-body-sm text-text-3 @max-xl/item:hidden", className)}
      {...props}
    />
  );
}

/**
 * The row's link, inside ItemTitle. Its hit area stretches over the whole row, so the row opens on a click
 * anywhere, while ItemActions stay their own buttons on top of it: no button inside a link.
 * Pass `render={<Link href=… />}` for client-side navigation.
 */
function ItemLink({ className, render, ...props }: useRender.ComponentProps<"a">) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        className: cn(
          "min-w-0 truncate after:absolute after:inset-0 after:rounded-soft after:content-['']",
          "focus-visible:outline-none focus-visible:after:focus-ring-inset",
          className,
        ),
      },
      { "data-slot": "item-link" } as React.ComponentProps<"a">,
      props,
    ),
    render,
  });
}

/** Buttons at the end of the row. They never drop, and sit above an ItemLink. */
function ItemActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-actions"
      className={cn("relative z-(--z-raised) flex shrink-0 items-center gap-1", className)}
      {...props}
    />
  );
}

function ItemHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-header"
      className={cn("flex basis-full items-center justify-between gap-2", className)}
      {...props}
    />
  );
}

function ItemFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-footer"
      className={cn("flex basis-full items-center justify-between gap-2", className)}
      {...props}
    />
  );
}

export {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemLink,
  ItemMedia,
  ItemMeta,
  ItemSeparator,
  ItemTitle,
  itemVariants,
  type ItemProps,
};
