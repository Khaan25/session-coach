import { cn } from "cn";
import * as React from "react";

// Long-form text from Markdown (legal pages, docs): the design system type roles on the elements Markdown emits,
// at the reading measure. data-prose turns on the design system's prose link underline (base.css).
// size="sm": notes inside a panel (the tracker): body text, tighter spacing, full width. Code blocks sit in a well
// and tables scroll sideways on a narrow screen, with a row line between rows.
function Prose({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="prose"
      data-prose=""
      data-size={size}
      className={cn(
        "max-w-(--measure) type-body-lg text-text-2",
        "data-[size=sm]:max-w-none data-[size=sm]:type-body",
        "data-[size=sm]:[&_h2]:mt-6 data-[size=sm]:[&_ol]:my-3 data-[size=sm]:[&_p]:my-3 data-[size=sm]:[&_ul]:my-3 data-[size=sm]:[&_ul]:gap-1",
        "[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-soft [&_pre]:bg-well [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_table]:my-4 [&_table]:block [&_table]:overflow-x-auto [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_th]:px-3 [&_th]:py-2 [&_th]:text-start [&_th]:type-label [&_th]:text-text-1",
        "[&_thead+tbody_tr:first-child]:border-t [&_thead+tbody_tr:first-child]:border-line-row [&_tr+tr]:border-t [&_tr+tr]:border-line-row",
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
