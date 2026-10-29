"use client";

import { SpinnerIcon } from "@phosphor-icons/react";
import { cn } from "cn";

// The small turning arc Quartz uses for a running state, in the current text colour. Size it like an icon
// (size-3 in text, size-4 in controls and rows). The output element names it "Loading" for screen readers.
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <output data-slot="spinner" aria-label="Loading" className="contents">
      <SpinnerIcon
        aria-hidden="true"
        className={cn("size-4 shrink-0 animate-spin text-current", className)}
        {...props}
      />
    </output>
  );
}

export { Spinner };
