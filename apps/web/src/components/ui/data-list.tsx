import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

import { EMPTY_VALUE } from "@/lib/ui/format";

// Label and value pairs for a detail view: an eval run, a key, a prompt release. A real <dl> with each pair in a
// <div>, which HTML allows, inside a frame that measures the width. className goes on the frame (it
// places the list); every other prop goes on the <dl>.
//
// Horizontal lists share one grid: the label column is as wide as the longest label and no wider than
// 160px (fit-content), and every pair is a subgrid row of it, so all values start on one left edge
// without a fixed 160px gutter wasting space next to short labels like "ID". The list measures its own
// width: under 448px it stacks each label above its value, so it works in a 320px panel and on a page.
// An empty value (null, undefined or "") says "None" in text-3 on its own, so a missing field never
// renders as a blank that looks like a bug.
//
// variant="framed" (card and frame are the old names, kept) puts the list in its own frame with the pairs split by the row
// rule. Inside another frame use plain.

const dataListVariants = cva("group/data-list min-w-0", {
  variants: {
    variant: {
      plain: "",
      framed: "frame bg-page px-4",
      /** @deprecated Use framed. */
      card: "frame bg-page px-4",
      /** @deprecated Use framed. */
      frame: "frame bg-page px-4",
    },
    orientation: {
      horizontal: "",
      vertical: "",
    },
    size: {
      sm: "",
      default: "",
    },
  },
  defaultVariants: { variant: "plain", orientation: "horizontal", size: "default" },
});

type DataListProps = React.ComponentProps<"dl"> & VariantProps<typeof dataListVariants>;

function DataList({
  className,
  variant = "plain",
  orientation = "horizontal",
  size = "default",
  ...props
}: DataListProps) {
  return (
    <div
      data-slot="data-list-frame"
      // framed, frame and card are one look; the items key off "framed".
      data-variant={variant === "card" || variant === "frame" ? "framed" : variant}
      data-orientation={orientation}
      data-size={size}
      className={cn(
        "@container/data-list",
        dataListVariants({ variant, orientation, size }),
        className,
      )}
    >
      <dl
        data-slot="data-list"
        className={cn(
          "grid min-w-0 grid-cols-1",
          orientation === "horizontal" &&
            "@md/data-list:grid-cols-[fit-content(var(--label-column))_minmax(0,1fr)] @md/data-list:gap-x-4",
        )}
        {...props}
      />
    </div>
  );
}

function DataListItem({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="data-list-item"
      className={cn(
        "col-span-full flex min-h-(--row) min-w-0 flex-col justify-center gap-1 py-2",
        // The item's own gap would replace the list's 16px column gap in the subgrid, so it repeats it: the longest label never touches its value.
        "group-data-[orientation=horizontal]/data-list:@md/data-list:grid group-data-[orientation=horizontal]/data-list:@md/data-list:grid-cols-subgrid group-data-[orientation=horizontal]/data-list:@md/data-list:items-baseline group-data-[orientation=horizontal]/data-list:@md/data-list:gap-x-4",
        "group-data-[size=sm]/data-list:min-h-(--row-sm) group-data-[size=sm]/data-list:py-1.5",
        "group-data-[variant=framed]/data-list:[&+&]:rule-top",
        className,
      )}
      {...props}
    />
  );
}

function DataListLabel({ className, ...props }: React.ComponentProps<"dt">) {
  return (
    <dt
      data-slot="data-list-label"
      className={cn(
        "min-w-0 text-start type-label [overflow-wrap:anywhere] text-text-3 group-data-[size=sm]/data-list:type-label-sm",
        className,
      )}
      {...props}
    />
  );
}

// What React renders as nothing; an array (a `.map()` result) is empty when every element is.
const isEmpty = (node: React.ReactNode): boolean =>
  node === null ||
  node === undefined ||
  typeof node === "boolean" ||
  (typeof node === "string" && node.trim() === "") ||
  (Array.isArray(node) && node.every(isEmpty));

function DataListValue({
  className,
  mono = false,
  numeric = false,
  children,
  ...props
}: React.ComponentProps<"dd"> & {
  /** Set identifiers, hashes and paths in mono. */
  mono?: boolean;
  /** Tabular figures, for a count, a time or a price that lines up with its neighbours. */
  numeric?: boolean;
}) {
  return (
    <dd
      data-slot="data-list-value"
      data-empty={isEmpty(children) || undefined}
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-2 text-start type-body [overflow-wrap:anywhere] text-text-1",
        "group-data-[size=sm]/data-list:type-body-sm",
        mono && "type-tag",
        numeric && "data",
        className,
      )}
      {...props}
    >
      {isEmpty(children) ? <DataListEmpty /> : children}
    </dd>
  );
}

/** The placeholder for a field with no value. DataListValue shows it on its own for an empty value. */
function DataListEmpty({
  className,
  children = EMPTY_VALUE,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span data-slot="data-list-empty" className={cn("font-sans text-text-3", className)} {...props}>
      {children}
    </span>
  );
}

export { DataList, DataListItem, DataListLabel, DataListValue, DataListEmpty, dataListVariants };
