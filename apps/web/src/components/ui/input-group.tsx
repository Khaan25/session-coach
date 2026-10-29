"use client";

import { Input as InputPrimitive } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";

// Quartz's field box around a bare control plus slots: the box draws the paper, the 1px control edge, its
// darker hover, the ink focus edge with its halo and the fail edge, so an icon, unit or button in an addon
// sits inside the edge and a click on it focuses the text.
function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        "group/input-group relative flex h-(--control) w-full min-w-0 items-center rounded-soft bg-page type-label text-text-1 control-edge outline-none forced-colors:border pointer-coarse:text-base",
        "transition-[color,background-color,border-color,box-shadow] duration-(--dur-fast) ease-(--ease-step)",
        "has-[[data-slot=input-group-control]:focus-visible]:[--control-lift:var(--focus-halo)]! has-[[data-slot=input-group-control]:focus-visible]:[--frame-color:var(--border-focus)]!",
        "has-[[data-slot][aria-invalid=true]]:[--frame-color:var(--fail-line)]",
        "hover:not-has-[[data-slot=input-group-control]:disabled]:not-has-[[data-slot][aria-invalid=true]]:[--frame-color:var(--line-control-hover)]",
        "has-[[data-slot=input-group-control]:disabled]:cursor-not-allowed has-[[data-slot=input-group-control]:disabled]:text-text-disabled has-[[data-slot=input-group-control]:disabled]:[--control-lift:var(--elev-none)] has-[[data-slot=input-group-control]:disabled]:[--frame-color:var(--line-row)]",
        "in-data-[slot=combobox-content]:focus-within:[--control-lift:var(--elev-none)]",
        "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto",
        "has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pe-2 has-[>[data-align=inline-start]]:[&>input]:ps-2",
        className,
      )}
      {...props}
    />
  );
}

const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-2 py-2 type-label text-text-3 select-none group-data-[disabled=true]/input-group:text-text-disabled [&>svg]:text-text-2 [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        "inline-start": "order-first ps-3 has-[>button]:ps-1 has-[>kbd]:ps-1",
        "inline-end": "order-last pe-3 has-[>button]:pe-1 has-[>kbd]:pe-1",
        "block-start":
          "order-first w-full justify-start px-3 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2",
        "block-end":
          "order-last w-full justify-start px-3 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  },
);

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    // Pointer-only affordance: clicking the gap beside the input focuses it,
    // and keyboard users just tab there. A role would announce a control that
    // isn't one.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onMouseDown={(event) => {
        if ((event.target as HTMLElement).closest("button")) {
          return;
        }

        event.preventDefault();
        event.currentTarget.parentElement?.querySelector("input")?.focus();
      }}
      {...props}
    />
  );
}

// A button inside the box leaves 4px on every side (24px in the 32px box) and takes the inner corner (button.tsx's
// in-data-[slot=input-group] rule), since it is a thing inside a control.
const inputGroupButtonSize = {
  xs: "xs",
  sm: "xs",
  "icon-xs": "icon-xs",
  "icon-sm": "icon-sm",
} as const;

function InputGroupButton({
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size" | "type"> & {
  size?: keyof typeof inputGroupButtonSize;
  type?: "button" | "submit" | "reset";
}) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      size={inputGroupButtonSize[size]}
      {...props}
    />
  );
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 type-label text-text-3 [&_svg]:pointer-events-none [&_svg]:text-text-2 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

// The bare control inside the box. The box draws its fill and its edge.
const bareControl =
  "w-full min-w-0 flex-1 bg-transparent px-3 text-inherit outline-none placeholder:text-text-3 disabled:cursor-not-allowed disabled:placeholder:text-text-disabled read-only:cursor-default";

function InputGroupInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      data-slot="input-group-control"
      className={cn(bareControl, "h-full", className)}
      {...props}
    />
  );
}

function InputGroupTextarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="input-group-control"
      className={cn(
        bareControl,
        "flex field-sizing-content min-h-16 resize-none py-2 leading-5!",
        className,
      )}
      {...props}
    />
  );
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
};
