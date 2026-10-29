"use client";

import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "cn";

import { fieldControlVariants } from "@/components/ui/field";

// Quartz's input: one line of text in the paper field box, 32px tall, the 6px soft corner, a 1px control
// edge that darkens on hover and turns ink with a soft halo on focus.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        fieldControlVariants({ size: "default" }),
        "read-only:cursor-default",
        "file:me-3 file:h-6 file:cursor-pointer file:rounded-inner file:border-0 file:bg-pressed file:px-2 file:type-label-sm file:text-text-1",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
