"use client";

import { SpinnerIcon } from "@phosphor-icons/react";
import { cn } from "cn";

// The small turning arc the design system uses for a running state, in the current text colour. Size it like an icon
// (size-3 in text, size-4 in controls and rows). A hidden "Loading" inside the output is what screen readers hear.
// Under reduced motion it turns slowly instead of stopping, so the running state still reads.
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <output data-slot="spinner" className="contents">
      <span className="sr-only">Loading</span>
      <SpinnerIcon
        aria-hidden="true"
        className={cn(
          "size-4 shrink-0 animate-spin text-current motion-reduce:[animation-duration:3s]",
          className,
        )}
        {...props}
      />
    </output>
  );
}

export { Spinner };
