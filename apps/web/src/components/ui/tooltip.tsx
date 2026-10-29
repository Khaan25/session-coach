"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "cn";

import { useQuartzPortal } from "@/lib/quartz/portal";

// Quartz's tooltip chip: the inverse surface (data-surface="inverse" flips the channels, so bg-page reads ink
// on a light page and paper on a dark one), the soft 6px corner, a 12px label and no arrow. The motion is the
// zip's: it grows out of --transform-origin from the trigger's side.

function TooltipProvider({ delay = 0, ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} {...props} />;
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

/** The chip's look, shared with the anchored toast. */
const tooltipPopupClass =
  "inline-flex min-h-6 w-fit max-w-(--tooltip-max) items-center gap-2 rounded-soft bg-page px-2 py-1 type-label-sm break-words text-text-1 shadow-overlay has-data-[slot=kbd]:pe-1 forced-colors:outline-1 forced-colors:outline-[CanvasText] forced-colors:outline-solid";

function TooltipContent({
  className,
  side = "top",
  sideOffset = 6,
  align = "center",
  alignOffset = 0,
  collisionPadding = 8,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "collisionPadding"
  >) {
  const container = useQuartzPortal();

  return (
    <TooltipPrimitive.Portal container={container}>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className="isolate z-(--z-overlay)"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          data-surface="inverse"
          className={cn(
            tooltipPopupClass,
            "origin-(--transform-origin) duration-150 ease-out-quint data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-start-2 data-[side=inline-start]:slide-in-from-end-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:duration-100 data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, tooltipPopupClass };
