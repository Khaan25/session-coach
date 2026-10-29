"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

import { controlHeight } from "@/lib/quartz/utils";

// Quartz's pressed button (its Button in toggle mode): ghost at rest, and pressed is an ink fill, the person's
// hand on it. Hue never fills a toggle. Outline adds the paper body and 1px control edge of the secondary key.
const toggleVariants = cva(
  [
    "group/toggle relative inline-flex items-center justify-center gap-1.5 rounded-soft type-label whitespace-nowrap text-text-1 outline-none select-none [-webkit-tap-highlight-color:transparent]",
    "transition-[color,background-color,border-color,box-shadow]",
    "hover:not-data-disabled:not-data-pressed:bg-ghost-hover active:not-data-disabled:not-data-pressed:bg-pressed",
    "data-pressed:bg-inverse data-pressed:text-text-inverse data-pressed:shadow-none data-pressed:hover:not-data-disabled:bg-button-primary-hover data-pressed:focus-visible:focus-ring-ink",
    "disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:text-text-disabled data-disabled:data-pressed:bg-pressed",
    "aria-invalid:[--frame-color:var(--fail-line)]",
    "forced-colors:border forced-colors:border-solid forced-colors:border-[ButtonText] forced-colors:data-pressed:bg-[Highlight]! forced-colors:data-pressed:text-[HighlightText]! forced-colors:data-pressed:[forced-color-adjust:none]",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default: "touch-target bg-ghost",
        outline:
          "bg-page control-edge hover:not-data-disabled:not-data-pressed:[--frame-color:var(--line-control-hover)] data-disabled:[--frame-color:var(--text-disabled)]",
      },
      size: {
        default: `${controlHeight.default} min-w-(--control) px-3 has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2`,
        sm: `${controlHeight.sm} min-w-(--control-sm) px-2 has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5`,
        lg: `${controlHeight.lg} min-w-(--control-lg) px-4 type-button has-data-[icon=inline-end]:pe-3 has-data-[icon=inline-start]:ps-3`,
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
