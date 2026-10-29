import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

import { Label } from "@/components/ui/label";

// Quartz's field look on the shadcn Field API. Hue only enters through the fail slot: an invalid control's
// edge turns the fail line and the error text takes the fail text step. No wash: trouble is marked on the
// edge, not painted across the field.

// ---------- the shared field box ----------

/**
 * A bare control that is its own box: Input, Textarea. Paper with a 1px control edge (control-edge) and the 6px
 * soft corner. The edge darkens on hover, turns ink on focus and the fail line when invalid, with no outline
 * around it. Read-only, it is a well: grey, no edge, a value to copy.
 */
const fieldControlVariants = cva(
  [
    "w-full min-w-0 rounded-soft bg-page type-label text-text-1 control-edge outline-none forced-colors:border pointer-coarse:text-base",
    "transition-[color,background-color,border-color,box-shadow,outline-color] duration-(--dur-fast) ease-(--ease-step)",
    "placeholder:text-text-3",
    // Focus is the edge turning ink, eased in: no outline floating off the control.
    "focus-visible:outline-none focus-visible:[--control-lift:var(--focus-halo)]! focus-visible:[--frame-color:var(--border-focus)]!",
    "aria-invalid:[--frame-color:var(--fail-line)] data-invalid:[--frame-color:var(--fail-line)]",
    "hover:not-disabled:not-data-disabled:not-aria-invalid:not-data-invalid:not-[[readonly]]:[--frame-color:var(--line-control-hover)]",
    // Disabled keeps the shape on the quiet row line and drops the lift, so it never reads heavier than the field at rest.
    "disabled:cursor-not-allowed disabled:text-text-disabled disabled:[--control-lift:var(--elev-none)] disabled:[--frame-color:var(--line-row)] disabled:placeholder:text-text-disabled",
    "data-disabled:cursor-not-allowed data-disabled:text-text-disabled data-disabled:[--control-lift:var(--elev-none)] data-disabled:[--frame-color:var(--line-row)]",
    "[&[readonly]]:bg-well [&[readonly]]:[--control-lift:var(--elev-none)] [&[readonly]]:[--frame-color:transparent]",
  ],
  {
    variants: {
      size: {
        sm: "h-(--control-sm) px-2",
        default: "h-(--control) px-3",
        lg: "h-(--control-lg) px-4",
      },
    },
    defaultVariants: { size: "default" },
  },
);

// ---------- Field ----------

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        "flex min-w-0 flex-col gap-6 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
        className,
      )}
      {...props}
    />
  );
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "mb-2 text-text-1 data-[variant=label]:type-label data-[variant=legend]:type-heading-sm",
        className,
      )}
      {...props}
    />
  );
}

/** Groups fieldsets and fields with a 24px rhythm, and is the container responsive fields query. */
function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        "group/field-group @container/field-group flex w-full flex-col gap-6 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4",
        className,
      )}
      {...props}
    />
  );
}

const fieldVariants = cva("group/field flex w-full min-w-0 gap-2", {
  variants: {
    orientation: {
      vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
      horizontal:
        "flex-row items-center gap-3 has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-0.5",
      responsive:
        "flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:gap-6 @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-0.5",
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
});

function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  );
}

/** Stacks the label and description beside a control in a horizontal field. */
function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn("group/field-content flex flex-1 flex-col gap-1", className)}
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        "group/field-label peer/field-label group-data-[disabled=true]/field:text-text-disabled",
        // A label wrapping a whole field is a choice card: the frame, the selected wash once its control is on.
        "has-data-checked:bg-selected has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:items-stretch has-[>[data-slot=field]]:rounded-frame has-[>[data-slot=field]]:control-edge *:data-[slot=field]:p-3",
        className,
      )}
      {...props}
    />
  );
}

/** A label-styled title that is not a <label>, for a field whose control names itself. */
function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        "flex w-fit items-center gap-2 type-label text-text-1 group-data-[disabled=true]/field:text-text-disabled",
        className,
      )}
      {...props}
    />
  );
}

/** Helper text under the control, read out with it. */
function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        "max-w-(--measure-hint) text-start type-body-sm text-pretty [overflow-wrap:anywhere] text-text-2 group-has-data-horizontal/field:text-balance group-data-[disabled=true]/field:text-text-3 [[data-variant=legend]+&]:-mt-1.5",
        "last:mt-0 nth-last-2:-mt-1",
        "[&_a]:underline [&_a]:decoration-1 [&_a]:underline-offset-4 [&_code]:type-code-sm",
        className,
      )}
      {...props}
    />
  );
}

/** A hairline between groups of fields, with optional words in the middle ("or"). */
function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  children?: React.ReactNode;
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn("relative -my-2 flex h-5 items-center", className)}
      {...props}
    >
      <div aria-hidden className="h-px w-full bg-line-row" />
      {children && (
        <span
          className="absolute start-1/2 -translate-x-1/2 bg-page px-2 type-body-sm text-text-3 rtl:translate-x-1/2"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  );
}

/** The error under the control, in the fail text. Duplicate messages are dropped; two or more become a list. */
function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<"div"> & {
  errors?: Array<{ message?: string } | undefined>;
}) {
  let content: React.ReactNode = children;
  if (!content && errors?.length) {
    const uniqueErrors = [
      ...new Map(errors.filter((e) => e?.message).map((e) => [e!.message, e!])).values(),
    ];
    content =
      uniqueErrors.length === 1 ? (
        uniqueErrors[0].message
      ) : uniqueErrors.length > 1 ? (
        <ul className="flex flex-col gap-1">
          {uniqueErrors.map((error) => (
            <li key={error.message}>{error.message}</li>
          ))}
        </ul>
      ) : null;
  }

  if (!content) {
    return null;
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      data-status="fail"
      className={cn(
        "flex min-w-0 items-start gap-2 type-body-sm text-pretty [overflow-wrap:anywhere] text-fail-text",
        className,
      )}
      {...props}
    >
      {content}
    </div>
  );
}

export {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
  fieldControlVariants,
};
