"use client";

import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "cn";

import { fieldControlVariants } from "@/components/ui/field";

// The design system's input: one line of text in the paper field box, 32px tall, the 6px soft corner, a 1px control
// edge that darkens on hover and turns ink with a soft halo on focus.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        fieldControlVariants({ size: "default" }),
        "read-only:cursor-default",
        // The file button is a segment on the field's start edge: full height, the grey well, a rule before the name.
        "file:-ms-3 file:me-3 file:h-full file:cursor-pointer file:rounded-s-soft file:border-0 file:border-e file:border-solid file:border-(--line-control) file:bg-well file:px-3 file:type-label file:text-text-1 file:transition-colors hover:file:bg-hover",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
