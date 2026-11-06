import * as React from "react";
import { cn } from "cn";

import { fieldControlVariants } from "@/components/ui/field";

// The design system's textarea: the same paper field with a control edge as Input, on a 20px line. field-sizing grows it
// with its content; the width is pinned to the container so only the height follows the text.
function Textarea({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"textarea"> & { variant?: "default" | "answer" | "writing" }) {
  return (
    <textarea
      data-slot="textarea"
      data-variant={variant}
      className={cn(
        fieldControlVariants({ size: "default" }),
        "control-textarea flex field-sizing-content h-auto min-h-16 w-full resize-none px-3 py-2 leading-5! read-only:cursor-default",
        // No max height by default, so it grows with its text. Give it one (max-h-40) and the text scrolls there,
        // and each edge with more behind it fades, so no line is cut without a cue. While focused the fade is off:
        // a mask also cuts the focus halo, and the caret's line is in view then.
        "scroll-fade-y focus-visible:mask-none",
        variant === "writing" && "learning-writing",
        variant === "answer" && "min-h-48 resize-y p-4 leading-7! type-body-lg",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
