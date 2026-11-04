import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

import type { Kind } from "@/lib/ui/kind";

// The design system's badge: a static label, one shape per meaning, so a reader can tell them apart in grayscale.
// - Tint, no line: a kind (`<Badge kind="run"/>`), the one place hue fills. With no kind the tint is the neutral wash.
// - Paper, a 1px line, ink text: trouble ("Over budget", "Revoked") or a plain outlined tag. The line carries the
//   colour (the warn or fail line step) and the word stays ink.
// - success and warning: the app's session-status and score badges, on their wash with their text step.
// CodeTag: a method or a status code in mono, in the same outlined box.
// Two sizes: default 20px and sm 16px, both on the 4px inner corner with 12px text. A count takes `count` and
// `max`: past the cap it shows "99+" and keeps the exact number for screen readers and the title.

type BadgeStatus = "warn" | "fail";

const kindLabels: Record<Kind | BadgeStatus, string> = {
  agent: "Agent",
  key: "Key",
  run: "Run",
  deploy: "Deploy",
  model: "Model",
  warn: "Warning",
  fail: "Failed",
};

const badgeVariants = cva(
  [
    "group/badge relative inline-flex w-fit shrink-0 items-center justify-center overflow-hidden rounded-inner whitespace-nowrap tabular-nums",
    "transition-[color,background-color,border-color,box-shadow]",
    "focus-visible:focus-ring",
    "[&>svg]:pointer-events-none [&>svg]:shrink-0 [&>svg:not([class*='size-'])]:size-3",
    "forced-colors:outline forced-colors:outline-1 forced-colors:-outline-offset-1",
  ],
  {
    variants: {
      variant: {
        // No badge takes ink: the default is the quiet tint, the design system's own default.
        default: "bg-accent-tint text-accent-label [a]:hover:bg-hover",
        secondary: "bg-accent-tint text-accent-label [a]:hover:bg-hover",
        outline:
          "frame bg-page text-text-1 [--frame-color:var(--line-control)] [--frame-radius:var(--radius-inner)] [a]:hover:bg-hover",
        ghost: "bg-transparent text-text-2 hover:bg-hover hover:text-text-1",
        warn: "frame bg-page text-text-1 [--frame-color:var(--accent-line)] [--frame-radius:var(--radius-inner)] [a]:hover:bg-hover",
        destructive:
          "frame bg-page text-text-1 [--frame-color:var(--accent-line)] [--frame-radius:var(--radius-inner)] [a]:hover:bg-hover",
        success: "bg-success-wash text-success-text",
        warning: "bg-warning-wash text-warning-text",
        link: "h-auto px-0 text-text-1 decoration-1 underline-offset-4 [a]:hover:underline",
      },
      size: {
        default:
          "min-h-(--tag) min-w-(--tag) gap-1 px-1.5 py-0.5 type-label-sm has-data-[icon=inline-end]:pe-1 has-data-[icon=inline-start]:ps-1",
        sm: "min-h-4 min-w-4 gap-0.5 px-1 type-label-sm",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type BadgeProps = useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    /** The kind this badge names. Sets data-kind and shows the kind's word on its tint. */
    kind?: Kind;
    /** warn or fail, for a label that names trouble rather than a kind. Outlined in the reserved line step. */
    status?: BadgeStatus;
    /** Replaces the kind's word: `<Badge kind="run" label="Nightly run"/>`. */
    label?: React.ReactNode;
    /** A count. With `max`, values past it show as "max+"; the exact number stays in the accessible name. */
    count?: number;
    /** The cap for `count`. 99 by default. */
    max?: number;
  };

function Badge({
  className,
  variant = "default",
  size = "default",
  kind,
  status,
  label,
  count,
  max = 99,
  render,
  children,
  ...props
}: BadgeProps) {
  const tone =
    status ?? (variant === "destructive" ? "fail" : variant === "warn" ? "warn" : undefined);
  const named = kind ?? status;
  const capped = count !== undefined && count > max;
  const word = label ?? children ?? (named ? kindLabels[named] : undefined);
  const shown = count === undefined ? word : capped ? `${max}+` : count.toLocaleString("en-US");
  // Trouble is outlined whatever variant was asked for; a kind keeps the asked variant.
  const look = tone ? (tone === "fail" ? "destructive" : "warn") : variant;
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant: look, size }), className),
        children: capped ? (
          <>
            <span aria-hidden>{shown}</span>
            <span className="sr-only">{count.toLocaleString("en-US")}</span>
          </>
        ) : (
          shown
        ),
      },
      {
        "data-slot": "badge",
        "data-kind": kind,
        "data-status": tone,
        "data-size": size,
        title: capped ? count.toLocaleString("en-US") : undefined,
      } as React.ComponentProps<"span">,
      props,
    ),
    render,
    state: { slot: "badge", variant },
  });
}

type CodeTagStatus = "neutral" | "warn" | "fail";

/** The status an HTTP status code reads in: 5xx fail, 4xx warn, everything else neutral. */
function codeStatus(code: number | string | undefined): CodeTagStatus {
  const n = Number(code);
  if (!Number.isInteger(n)) return "neutral";
  if (n >= 500 && n < 600) return "fail";
  if (n >= 400 && n < 500) return "warn";
  return "neutral";
}

type CodeTagProps = React.ComponentProps<"span"> & {
  /** An HTTP status code. Shown as the text unless children replace it, and picks the status. */
  code?: number | string;
  /** Overrides the status `code` picks. A method stays neutral: DELETE is not trouble. */
  status?: CodeTagStatus;
  /** soft: a grey fill (default). solid: ink, or the status's mark, for a column of status codes. outline: a line only. */
  fill?: "soft" | "solid" | "outline";
};

/** A code, a method or a status code in mono, in a 20px box: `<CodeTag code={503}/>`, `<CodeTag>POST</CodeTag>`. */
function CodeTag({ code, status, fill = "soft", className, children, ...props }: CodeTagProps) {
  const t = status ?? codeStatus(code);
  return (
    <span
      data-slot="code-tag"
      data-fill={fill}
      data-status={t === "neutral" ? undefined : t}
      className={cn(
        "frame inline-flex h-(--tag) min-w-(--tag) shrink-0 items-center justify-center px-1.5 type-tag whitespace-nowrap text-text-1 [--frame-radius:var(--radius-inner)]",
        "data-[fill=soft]:bg-selected data-[fill=soft]:[--frame-color:transparent] data-[fill=soft]:data-status:[--frame-color:var(--accent-line)]",
        "data-[fill=solid]:bg-inverse data-[fill=solid]:text-text-inverse data-[fill=solid]:[--frame-color:transparent] data-[fill=solid]:data-status:bg-accent-mark data-[fill=solid]:data-status:text-on-field",
        "data-[fill=outline]:bg-page data-[fill=outline]:[--frame-color:var(--line-control)] data-[fill=outline]:data-status:[--frame-color:var(--accent-line)]",
        "forced-colors:outline forced-colors:outline-1 forced-colors:-outline-offset-1",
        className,
      )}
      {...props}
    >
      {children ?? code}
    </span>
  );
}

export {
  Badge,
  badgeVariants,
  CodeTag,
  codeStatus,
  kindLabels,
  type BadgeProps,
  type BadgeStatus,
  type CodeTagProps,
  type CodeTagStatus,
};
