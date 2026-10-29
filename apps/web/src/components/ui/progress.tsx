"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { cn } from "cn";

// Quartz's bar: a 4px neutral track with one fill from the start edge, drawn in the line step so it reads as
// a line at 3:1, like a chart's. Set data-kind or data-status="warn" | "fail" on the root to recolour the fill.
// The fill eases to its new width (the zip's timing).
function Progress({ className, children, value, ...props }: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      // A fixed locale, so the server and the browser format the value the same way.
      locale="en-US"
      className={cn(
        "group/progress flex w-full min-w-0 flex-wrap items-baseline gap-x-3 gap-y-2",
        className,
      )}
      {...props}
    >
      {children}
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  );
}

function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      className={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden bg-cell-quiet forced-colors:bg-[Canvas] forced-colors:outline forced-colors:outline-1",
        className,
      )}
      data-slot="progress-track"
      {...props}
    />
  );
}

function ProgressIndicator({ className, ...props }: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn(
        "h-full bg-accent-line transition-[width] duration-300 ease-out motion-reduce:transition-none forced-colors:bg-[CanvasText]",
        className,
      )}
      {...props}
    />
  );
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      className={cn("min-w-0 truncate type-label text-text-1", className)}
      data-slot="progress-label"
      {...props}
    />
  );
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      className={cn("ms-auto type-label-sm data text-text-2", className)}
      data-slot="progress-value"
      {...props}
    />
  );
}

export { Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue };
