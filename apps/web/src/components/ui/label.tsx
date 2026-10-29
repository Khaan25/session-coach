import * as React from "react";
import { cn } from "cn";

// The design system's label: the 14/16 label role in text-1, its icons a step quieter. A disabled control (peer or the
// field around it) greys the label to the disabled text, so the pair reads as one off thing.
const labelClasses = [
  "inline-flex w-fit max-w-full min-w-0 items-center gap-2 type-label text-text-1 select-none [overflow-wrap:anywhere]",
  "[&_svg]:shrink-0 [&_svg]:text-text-2",
  "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:text-text-disabled",
  "peer-disabled:cursor-not-allowed peer-disabled:text-text-disabled",
].join(" ");

type LabelProps = React.ComponentProps<"label"> & {
  /** Adds a quiet "Optional" after the label. Mark the few optional fields, not the many required ones. */
  optional?: boolean;
};

function Label({ className, htmlFor, optional, children, ...props }: LabelProps) {
  return (
    <label data-slot="label" htmlFor={htmlFor} className={cn(labelClasses, className)} {...props}>
      {children}
      {optional && <LabelHint>Optional</LabelHint>}
    </label>
  );
}

/** Quiet text after a label: "Optional", a unit, a limit. */
function LabelHint({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span data-slot="label-hint" className={cn("type-body-sm text-text-3", className)} {...props} />
  );
}

export { Label, LabelHint, labelClasses, type LabelProps };
