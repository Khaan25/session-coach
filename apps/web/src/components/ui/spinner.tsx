"use client";

import { SpinnerIcon } from "@phosphor-icons/react";
import { cn } from "cn";

// The small turning arc the design system uses for a running state, in the current text colour. Size it like an icon
// (size-3 in text, size-4 in controls and rows). A hidden label ("Loading") inside the output is what screen readers
// hear. Inside a button pass label="": the button's own text names it, so only the icon renders (set aria-busy on
// the button instead). Under reduced motion it turns slowly instead of stopping, so the running state still reads.
function Spinner({
  className,
  label = "Loading",
  ...props
}: React.ComponentProps<"svg"> & { label?: string }) {
  const icon = (
    <SpinnerIcon
      aria-hidden="true"
      data-slot={label ? undefined : "spinner"}
      className={cn(
        "size-4 shrink-0 animate-spin text-current motion-reduce:[animation-duration:3s]",
        className,
      )}
      {...props}
    />
  );
  if (!label) return icon;
  return (
    <output data-slot="spinner" className="contents">
      <span className="sr-only">{label}</span>
      {icon}
    </output>
  );
}

export { Spinner };
