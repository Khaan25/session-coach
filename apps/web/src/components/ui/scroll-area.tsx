"use client";

import * as React from "react";
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { cn } from "cn";

// Quartz has no scroll area; this is the zip's, skinned with Quartz's scrollbar thumb role (--scrollbar-thumb, the
// same colour native scrollbars take in .quartz), its inset focus ring and its edge fade.

function ScrollArea({
  className,
  viewportClassName,
  children,
  ...props
}: Omit<ScrollAreaPrimitive.Root.Props, "className"> & {
  className?: string;
  // `h-full` only resolves against a definite height; pass `h-auto flex-auto min-h-0 overflow-y-auto` to scroll inside a flex parent.
  viewportClassName?: string;
}) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className={cn(
          "h-full w-full scroll-fade-y rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:focus-ring-inset data-has-overflow-y:pe-3",
          viewportClassName,
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: Omit<ScrollAreaPrimitive.Scrollbar.Props, "className"> & { className?: string }) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-s data-vertical:border-s-transparent",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-(--scrollbar-thumb) forced-colors:bg-[CanvasText]"
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };
