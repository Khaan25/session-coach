"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CaretDownIcon, CaretUpDownIcon, CaretUpIcon, CheckIcon } from "@phosphor-icons/react";
import { cn } from "cn";

import {
  menuLabelClass,
  menuSeparatorClass,
  popupMotionClass,
} from "@/components/ui/dropdown-menu";
import { overlaySurface } from "@/lib/ui/overlay";
import { usePortalContainer } from "@/lib/ui/portal";
import { controlHeight, mergeClass } from "@/lib/ui/utils";

// The design system's select skin on the zip's motion. The trigger is a field box: paper with a 1px control edge, the 6px soft
// corner and an up-down caret. The popup is the overlay surface around menu-item rows; the highlighted row takes the
// hover wash and the chosen one the selected wash and a check. The popup is never narrower than the trigger.
// Motion is the dropdown menu's (grow from the trigger, fade, zoom, slide), except when the popup is laid over the
// trigger (alignItemWithTrigger): it then appears in place, since sliding from a side it did not open on reads wrong.
const listPopupClass = cn(
  "relative isolate z-(--z-overlay) flex max-h-(--available-height) max-w-[min(var(--popover),var(--available-width))] min-w-(--anchor-width) flex-col overflow-hidden p-1 [&_[role=listbox]]:scroll-fade-y",
  overlaySurface,
  popupMotionClass,
  "data-[align-trigger=true]:animate-none",
);

// The row is menu-item, the one every list popup shares. A listbox adds the chosen wash (it stays under the hover
// wash) and a trailing check, so it reserves 32px at the end, and it keeps the keyboard ring on the row.
const listItemClass = cn(
  "menu-item w-full pe-8 [&_svg:not([class*='size-'])]:size-4",
  "focus-visible:focus-ring-inset data-selected:bg-accent-wash data-selected:data-highlighted:bg-accent-wash forced-colors:data-selected:data-highlighted:bg-[Highlight]!",
);

const fieldTriggerClass = cn(
  "group/select-trigger flex w-fit min-w-40 items-center justify-between gap-2 rounded-soft bg-page px-3 text-start type-label whitespace-nowrap control-edge select-none",
  "text-text-1 transition-[background-color,box-shadow,outline-color]",
  "hover:not-data-disabled:not-aria-invalid:[--frame-color:var(--line-control-hover)] data-popup-open:not-aria-invalid:[--frame-color:var(--line-control-hover)]",
  "aria-invalid:[--frame-color:var(--fail-line)]",
  // Focus and open are the edge turning ink, eased in, in place of an outline.
  "focus-visible:outline-none focus-visible:[--control-lift:var(--focus-halo)]! focus-visible:[--frame-color:var(--border-focus)]! data-popup-open:[--control-lift:var(--focus-halo)]! data-popup-open:[--frame-color:var(--border-focus)]!",
  "data-disabled:cursor-not-allowed data-disabled:text-text-disabled data-disabled:[--control-lift:var(--elev-none)] data-disabled:[--frame-color:var(--line-row)]",
  "[-webkit-tap-highlight-color:transparent] forced-colors:border forced-colors:border-solid forced-colors:border-[ButtonText]",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
);

// Height grows with the text past the token, so a zoomed label never clips. Padding is the field box's: 8, 12 and 16px.
const triggerSize = {
  sm: `${controlHeight.sm} px-2`,
  default: controlHeight.default,
  lg: `${controlHeight.lg} px-4`,
} as const;

const Select = SelectPrimitive.Root;

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={mergeClass("scroll-my-1", className)}
      {...props}
    />
  );
}

// The value and the item text are blocks, not flex rows, so a long label ends in an ellipsis instead of a cut glyph.
const textClass = "block min-w-0 flex-1 truncate";

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={mergeClass([textClass, "data-placeholder:text-text-3"], className)}
      {...props}
    />
  );
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default" | "lg";
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={mergeClass([fieldTriggerClass, triggerSize[size]], className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="flex text-text-2">
        <CaretUpDownIcon />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = true,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >) {
  const container = usePortalContainer();
  return (
    <SelectPrimitive.Portal container={container}>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-(--z-overlay) outline-none"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={mergeClass(listPopupClass, className)}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List className="max-h-(--popup-max) scroll-py-1 overflow-y-auto">
            {children}
          </SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={mergeClass(menuLabelClass, className)}
      {...props}
    />
  );
}

function SelectItem({ className, children, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={mergeClass(listItemClass, className)}
      {...props}
    >
      <SelectPrimitive.ItemText className={textClass}>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute end-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={mergeClass(["pointer-events-none", menuSeparatorClass], className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={mergeClass(
        "top-0 z-(--z-raised) flex h-(--control-xs) w-full cursor-default items-center justify-center bg-raised text-text-2 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <CaretUpIcon />
    </SelectPrimitive.ScrollUpArrow>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={mergeClass(
        "bottom-0 z-(--z-raised) flex h-(--control-xs) w-full cursor-default items-center justify-center bg-raised text-text-2 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <CaretDownIcon />
    </SelectPrimitive.ScrollDownArrow>
  );
}

export {
  fieldTriggerClass,
  listItemClass,
  listPopupClass,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
