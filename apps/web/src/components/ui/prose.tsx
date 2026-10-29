import { cn } from "cn";
import * as React from "react";

// Long-form text from Markdown (legal pages, docs): Quartz type roles on the elements Markdown emits,
// at the reading measure. data-prose turns on Quartz's prose link underline (base.css).
function Prose({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="prose"
      data-prose=""
      className={cn(
        "max-w-(--measure) type-body-lg text-text-2",
        "[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:type-heading-sm [&_h2]:text-text-1 [&_h2:first-child]:mt-0",
        "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:type-heading-xs [&_h3]:text-text-1",
        "[&_p]:my-4 [&_strong]:font-medium [&_strong]:text-text-1",
        "[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:ps-6 [&_ul]:my-4 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:ps-6",
        "[&_li]:ps-1 [&_li]:marker:text-text-3",
        "[&_code]:rounded-inner [&_code]:bg-well [&_code]:px-1 [&_code]:type-code-sm [&_code]:text-text-1",
        className,
      )}
      {...props}
    />
  );
}

export { Prose };
