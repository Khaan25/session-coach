import * as React from "react";
import { cn } from "cn";

import { fieldControlVariants } from "@/components/ui/field";

// The design system's textarea: the same paper field with a control edge as Input, on a 20px line. field-sizing grows it
// with its content; the width is pinned to the container so only the height follows the text.
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        fieldControlVariants({ size: "default" }),
        "flex field-sizing-content h-auto min-h-16 w-full resize-none px-3 py-2 leading-5! read-only:cursor-default",
        // At its max height the text scrolls, and each edge with more behind it fades, so no line is cut without a cue.
        "scroll-fade-y focus-visible:mask-none",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
