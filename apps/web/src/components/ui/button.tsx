import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

import { controlHeight } from "@/lib/quartz/utils";

// Quartz's button skin: 32px tall (28 at sm, 44 at lg), the 6px control corner, a 14/16 label. Default is the one
// lit ink key in a view; outline and secondary are the paper key with the 1px control edge. Destructive is written,
// not painted: paper, a fail edge and fail text, never a red fill. Focus is base.css's 2px ring on every variant.
// Height is max(--control, one line plus padding), so a label at 200% text zoom grows the box instead of spilling.

// Doesn't apply the scale effect to dialog open buttons (those with aria-haspopup)
const tapScale =
  "not-data-static:active:not-aria-[haspopup]:scale-[0.98] motion-reduce:scale-none!";

const buttonVariants = cva(
  [
    "group/button relative inline-flex max-w-full shrink-0 items-center justify-center gap-2 rounded-soft whitespace-nowrap outline-none select-none",
    "type-label transition-[color,background-color,border-color,box-shadow,scale] duration-(--dur-fast) ease-(--ease-step) [-webkit-tap-highlight-color:transparent] active:duration-(--dur-press)",
    "disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:text-text-disabled",
    "aria-invalid:[--frame-color:var(--fail-line)]",
    "in-data-[slot=button-group]:after:hidden in-data-[slot=input-group]:rounded-inner in-data-[slot=input-group]:after:hidden in-data-[slot=item-actions]:after:hidden",
    "forced-colors:border forced-colors:border-solid forced-colors:border-[ButtonText]",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        // key-*: a lit body, a lip and a base, a hover light and a sheen (utilities.css).
        default:
          "key key-primary text-text-inverse data-disabled:text-text-inverse data-disabled:opacity-(--dim-opacity) data-disabled:shadow-none",
        outline:
          "key text-text-1 key-secondary [--frame-color:var(--line-control-hover)] hover:not-data-disabled:[--frame-color:var(--ink)] aria-expanded:[--frame-color:var(--ink)] data-disabled:[--frame-color:var(--text-disabled)]",
        secondary:
          "key text-text-1 key-secondary [--frame-color:var(--line-control-hover)] hover:not-data-disabled:[--frame-color:var(--ink)] aria-expanded:[--frame-color:var(--ink)] data-disabled:[--frame-color:var(--text-disabled)]",
        ghost:
          "touch-target bg-ghost text-text-1 hover:not-data-disabled:bg-ghost-hover active:not-data-disabled:bg-pressed aria-expanded:bg-ghost-hover",
        destructive:
          "key text-fail-text key-secondary [--frame-color:var(--fail-line)] hover:not-data-disabled:[--frame-color:var(--fail-text)] data-disabled:[--frame-color:var(--text-disabled)]",
        link: "h-auto! min-h-6 gap-1 bg-transparent px-0! text-foreground decoration-1 underline-offset-4 hover:not-data-disabled:underline forced-colors:border-0 forced-colors:underline",
      },
      size: {
        default: `${controlHeight.default} px-4 has-data-[icon=inline-end]:pe-3 has-data-[icon=inline-start]:ps-3`,
        xs: `${controlHeight.xs} gap-1 px-2 type-label-sm has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5 [&_svg:not([class*='size-'])]:size-3.5`,
        sm: `${controlHeight.sm} gap-1.5 px-3 has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2`,
        lg: `${controlHeight.lg} px-5 type-button has-data-[icon=inline-end]:pe-4 has-data-[icon=inline-start]:ps-4`,
        icon: "size-(--control) px-0",
        "icon-xs": "size-(--control-xs) px-0 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-(--control-sm) px-0",
        "icon-lg": "size-(--control-lg) px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /** Drops the press-scale where the motion would distract. */
    "data-static"?: boolean;
  };

function Button({
  className,
  variant = "default",
  size = "default",
  "data-static": isStatic = false,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant}
      data-static={isStatic || undefined}
      className={cn(buttonVariants({ variant, size }), tapScale, className)}
      {...props}
    />
  );
}

export { Button, buttonVariants, type ButtonProps };
