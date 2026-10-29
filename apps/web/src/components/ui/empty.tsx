import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

import { CodeTag } from "@/components/ui/badge";

// What a region shows when it has nothing else to show. Quartz's empty state: it sits where the first row would
// have been, top-left of the body, never centred in a void, with a title, one muted line and the action. Four
// reasons share the shape and differ in how loud they are:
//   empty      nothing here yet; the first action creates it
//   no-results a search or filter matched nothing; write the query back in the title as an EmptyQuery
//   no-access  the person cannot see this; the action asks for access
//   error      it failed; role="alert", the fail (or warn) status word in EmptyStatus, the request ID in EmptyCode
// In a table, list or log it is variant="plain", sharing that frame; standalone (framed) it draws its own.

type EmptyReason = "empty" | "no-results" | "no-access" | "error";

const emptyVariants = cva(
  "group/empty flex w-full min-w-0 flex-col items-start gap-3 text-start text-text-1",
  {
    variants: {
      variant: {
        framed: "frame relative bg-page",
        plain: "",
      },
      size: {
        default: "px-4 py-6",
        sm: "gap-2 px-4 py-4",
      },
    },
    defaultVariants: { variant: "framed", size: "default" },
  },
);

type EmptyProps = React.ComponentProps<"div"> &
  VariantProps<typeof emptyVariants> & {
    /** Why there is nothing. error sets role="alert" and the fail hue. */
    reason?: EmptyReason;
    /** error only: fail (default) for errors, warn for something that ran partly. */
    status?: "fail" | "warn";
  };

function Empty({
  className,
  reason = "empty",
  status,
  variant = "framed",
  size = "default",
  role,
  ...props
}: EmptyProps) {
  const error = reason === "error";
  return (
    <div
      data-slot="empty"
      data-reason={reason}
      data-size={size}
      data-status={error ? (status ?? "fail") : undefined}
      role={role ?? (error ? "alert" : undefined)}
      className={cn(emptyVariants({ variant, size }), className)}
      {...props}
    />
  );
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn(
        "flex max-w-(--measure-short) flex-col gap-1 has-[>[data-slot=empty-icon]]:flex-row has-[>[data-slot=empty-icon]]:flex-wrap has-[>[data-slot=empty-icon]]:items-center has-[>[data-slot=empty-icon]]:gap-x-2 has-[>[data-slot=empty-icon]]:[&>[data-slot=empty-description]]:basis-full",
        className,
      )}
      {...props}
    />
  );
}

// Quartz draws no tile and no hue behind an empty state's icon: both variants are a bare 16px glyph in text-3.
const emptyMediaVariants = cva(
  "flex shrink-0 items-center justify-center text-text-3 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "",
        icon: "",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

/** Optional. A bare 16px icon before the title, on its line. Most leave it out; never art. */
function EmptyMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  );
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-title"
      className={cn(
        "type-heading-xs text-pretty text-text-1 group-data-[size=sm]/empty:type-label",
        className,
      )}
      {...props}
    />
  );
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-description"
      className={cn(
        "type-body-sm text-pretty text-text-2 [&_a]:text-text-1 [&_a]:underline [&_a]:decoration-1 [&_a]:underline-offset-4",
        className,
      )}
      {...props}
    />
  );
}

/** The actions: the first one that gets the person out of the empty state, and at most one quieter one. */
function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn("flex w-full max-w-sm min-w-0 flex-wrap items-center gap-2 pt-1", className)}
      {...props}
    />
  );
}

/** error: the status word in fail text (warn text for a warn state): "Failed", "Timed out", "Error 502". */
function EmptyStatus({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="empty-status" className={cn("flex items-center gap-2", className)} {...props}>
      <span className="type-state-word text-fail-text group-data-[status=warn]/empty:text-warn-text">
        {children}
      </span>
    </div>
  );
}

/** error: the code or request ID. One click selects all of it, for pasting into a support thread. */
function EmptyCode({ className, ...props }: React.ComponentProps<typeof CodeTag>) {
  return (
    <CodeTag
      data-slot="empty-code"
      fill="outline"
      className={cn("h-auto min-h-5 shrink break-all whitespace-normal select-all", className)}
      {...props}
    />
  );
}

/** The query or filter that emptied the list, inside the title: No runs match `timeout`. */
function EmptyQuery({ className, ...props }: React.ComponentProps<typeof CodeTag>) {
  return (
    <CodeTag
      data-slot="empty-query"
      fill="outline"
      className={cn("h-auto min-h-5 shrink align-baseline break-all whitespace-normal", className)}
      {...props}
    />
  );
}

export {
  Empty,
  EmptyCode,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyQuery,
  EmptyStatus,
  EmptyTitle,
  emptyVariants,
  type EmptyProps,
  type EmptyReason,
};
