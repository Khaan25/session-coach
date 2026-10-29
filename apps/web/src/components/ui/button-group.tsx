"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

// The design system's button group: joins related buttons into one control. Secondary and ghost members share one control
// line (frame-shared: each cell draws its start, top and bottom edges and the last one its end), so every line is
// one pixel, the outer corners round and the shared edges stay straight. Ink members (variant default) split on
// a 1px paper line instead. Members are cells edge to edge, so their focus ring sits inside them, paper on ink.
// A press does not scale a cell, so the joints never open. Groups inside a group sit 8px apart.
const buttonGroupVariants = cva(
  [
    "flex w-fit items-stretch gap-0 *:focus-visible:relative *:focus-visible:z-10",
    "*:active:scale-none! [&>:not([data-variant=default])]:shadow-none!",
    "*:focus-visible:focus-ring-inset *:data-pressed:focus-visible:focus-ring-ink *:data-[variant=default]:focus-visible:focus-ring-ink",
    "has-[>[data-variant=default]]:gap-px *:data-[variant=default]:rounded-none!",
    "has-[>[data-slot=button-group]]:gap-2",
    "[&>:not([data-variant=default])+[data-slot=button-group-separator]]:hidden has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-e-soft [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
  ],
  {
    variants: {
      orientation: {
        horizontal:
          "*:data-[variant=default]:first:rounded-s-soft! *:data-[variant=default]:last:rounded-e-soft! [&>:not([data-variant=default],[data-slot=button-group-separator])]:frame-shared",
        vertical:
          "flex-col *:data-[variant=default]:first:rounded-t-soft! *:data-[variant=default]:last:rounded-b-soft! [&>:not([data-variant=default],[data-slot=button-group-separator])]:frame-shared-y",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  },
);

function ButtonGroup({
  className,
  orientation,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
  );
}

function ButtonGroupText({ className, render, ...props }: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          "flex items-center gap-2 bg-page px-3 type-label text-text-2 forced-colors:border forced-colors:border-solid [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "button-group-text",
    },
  });
}

function ButtonGroupSeparator({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & { orientation?: "horizontal" | "vertical" }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      data-slot="button-group-separator"
      data-orientation={orientation}
      className={cn(
        "relative shrink-0 self-stretch rounded-none! bg-line-row forced-colors:bg-[CanvasText]",
        orientation === "vertical" ? "my-2 w-px" : "mx-2 h-px",
        className,
      )}
      {...props}
    />
  );
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants };
