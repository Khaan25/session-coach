"use client";

import * as React from "react";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { type VariantProps } from "class-variance-authority";
import { cn } from "cn";

import { toggleVariants } from "@/components/ui/toggle";

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants> & {
    spacing?: number;
    orientation?: "horizontal" | "vertical";
  }
>({
  size: "default",
  variant: "default",
  spacing: 2,
  orientation: "horizontal",
});

// spacing={0} joins the items into one control: outline items share one control line (frame-shared, as
// in ButtonGroup), only the outer corners round, and a focused item lifts above its neighbours.
function ToggleGroup({
  className,
  variant,
  size,
  spacing = 2,
  orientation = "horizontal",
  children,
  ...props
}: ToggleGroupPrimitive.Props &
  VariantProps<typeof toggleVariants> & {
    spacing?: number;
    orientation?: "horizontal" | "vertical";
  }) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      data-orientation={orientation}
      style={{ "--gap": spacing } as React.CSSProperties}
      className={cn(
        "group/toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))] rounded-soft data-vertical:flex-col data-vertical:items-stretch",
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, spacing, orientation }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive>
  );
}

function ToggleGroupItem({
  className,
  children,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext);

  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      data-spacing={context.spacing}
      className={cn(
        "shrink-0 group-data-[spacing=0]/toggle-group:rounded-none focus:z-10 focus-visible:z-10 group-data-[spacing=0]/toggle-group:focus-visible:focus-ring-inset group-data-[spacing=0]/toggle-group:data-pressed:focus-visible:focus-ring-ink",
        "group-data-horizontal/toggle-group:data-[spacing=0]:first:rounded-s-soft group-data-vertical/toggle-group:data-[spacing=0]:first:rounded-t-soft group-data-horizontal/toggle-group:data-[spacing=0]:last:rounded-e-soft group-data-vertical/toggle-group:data-[spacing=0]:last:rounded-b-soft",
        "group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:frame-shared group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:shadow-none group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:frame-shared-y group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:shadow-none",
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className,
      )}
      {...props}
    >
      {children}
    </TogglePrimitive>
  );
}

export { ToggleGroup, ToggleGroupItem };
