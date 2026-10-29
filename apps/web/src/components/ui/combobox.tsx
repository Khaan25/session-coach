"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CaretDownIcon, CheckIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { cn } from "cn";

import {
  menuLabelClass,
  menuSeparatorClass,
  popupMotionClass,
} from "@/components/ui/dropdown-menu";
import { listItemClass } from "@/components/ui/select";
import { overlaySurface } from "@/lib/quartz/overlay";
import { useQuartzPortal } from "@/lib/quartz/portal";
import { mergeClass } from "@/lib/quartz/utils";

// Quartz's combobox skin on the zip's motion. The field is Quartz's field box (paper, the 1px control edge, the ink edge
// and halo on focus); the popup is the same paper list as Select, with the dropdown menu's motion. A ComboboxInput
// rendered inside ComboboxContent becomes Quartz's search row (icon, bare field, a rule under it) instead of a field box.

type ControlSize = "sm" | "default" | "lg";

// The field box holds the bare control (data-control) and draws the edge, hover, focus and fail states for it.
const fieldBoxClass = cn(
  "group/field-box relative flex w-full min-w-0 items-center rounded-soft bg-page type-label text-text-1 control-edge forced-colors:border pointer-coarse:text-base",
  "transition-[background-color,box-shadow,outline-color] duration-(--dur-fast) ease-(--ease-step)",
  // Focus: the edge turns ink and a soft ink halo grows around it, eased. No outline floats off the box.
  "has-[[data-control]:focus]:[--control-lift:var(--focus-halo)]! has-[[data-control]:focus]:[--frame-color:var(--border-focus)]!",
  "has-[[data-control][aria-invalid=true]]:[--frame-color:var(--fail-line)]",
  "hover:not-data-disabled:not-has-[[data-control]:disabled]:not-has-[[data-control][aria-invalid=true]]:[--frame-color:var(--line-control-hover)]",
  "data-disabled:cursor-not-allowed data-disabled:text-text-disabled data-disabled:[--control-lift:var(--elev-none)] data-disabled:[--frame-color:var(--line-row)]",
  "has-[[data-control]:disabled]:cursor-not-allowed has-[[data-control]:disabled]:text-text-disabled has-[[data-control]:disabled]:[--control-lift:var(--elev-none)] has-[[data-control]:disabled]:[--frame-color:var(--line-row)]",
);

const fieldBoxSize = {
  sm: "h-(--control-sm) gap-2 px-2 has-[button]:pe-1",
  default: "h-(--control) gap-2 px-3 has-[button]:pe-1",
  lg: "h-(--control-lg) gap-2 px-4 has-[button]:pe-1",
} as const;

// A ghost action sized to sit inside the field box: the trigger caret and the clear button.
const fieldActionClass = cn(
  "touch-target relative flex size-6 shrink-0 items-center justify-center rounded-inner text-text-2 group-data-[size=lg]/field-box:size-9 group-data-[size=sm]/field-box:size-5",
  "transition-colors duration-(--dur-fast) ease-(--ease-step) motion-reduce:transition-none",
  "hover:not-data-disabled:bg-hover hover:not-data-disabled:text-text-1 data-disabled:text-text-disabled",
  "[&_svg:not([class*='size-'])]:size-4",
);

const InPopupContext = React.createContext(false);

const Combobox = ComboboxPrimitive.Root;

function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

function ComboboxTrigger({ className, children, ...props }: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      className={mergeClass(fieldActionClass, className)}
      {...props}
    >
      {children}
      <CaretDownIcon className="pointer-events-none transition-transform duration-(--dur-fast) group-has-data-popup-open/field-box:rotate-180 motion-reduce:transition-none" />
    </ComboboxPrimitive.Trigger>
  );
}

// Icon-only buttons are named here. Labels sit before the spread so a caller can override them.
function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      className={mergeClass(fieldActionClass, className)}
      aria-label="Clear selection"
      {...props}
    >
      <XIcon className="pointer-events-none" />
    </ComboboxPrimitive.Clear>
  );
}

function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  size = "default",
  ...props
}: Omit<ComboboxPrimitive.Input.Props, "size" | "className"> & {
  className?: string;
  showTrigger?: boolean;
  showClear?: boolean;
  size?: ControlSize;
}) {
  const inPopup = React.useContext(InPopupContext);
  if (inPopup) {
    // Inside the popup the input is Quartz's search row: no box of its own, the field's ink edge drawn inside the row on
    // focus, and the rule under it parting it from the list.
    return (
      <ComboboxPrimitive.InputGroup
        data-slot="combobox-input-group"
        className={cn("search-row rule-row", className)}
      >
        <MagnifyingGlassIcon className="size-4" />
        <ComboboxPrimitive.Input
          data-slot="combobox-input"
          data-control=""
          disabled={disabled}
          className="search-field outline-none"
          {...props}
        />
        {showClear && <ComboboxClear disabled={disabled} />}
        {children}
      </ComboboxPrimitive.InputGroup>
    );
  }
  return (
    <ComboboxPrimitive.InputGroup
      data-slot="combobox-input-group"
      data-size={size}
      className={cn(fieldBoxClass, fieldBoxSize[size], "w-auto", className)}
    >
      <ComboboxPrimitive.Input
        data-slot="combobox-input"
        data-control=""
        disabled={disabled}
        className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-3 disabled:cursor-not-allowed pointer-coarse:text-base"
        {...props}
      />
      {showClear && <ComboboxClear disabled={disabled} />}
      {showTrigger && (
        <ComboboxTrigger
          className="group-has-data-[slot=combobox-clear]/field-box:hidden"
          disabled={disabled}
          aria-label="Show suggestions"
        />
      )}
      {children}
    </ComboboxPrimitive.InputGroup>
  );
}

// The combobox popup holds its own search row and list, so it has no padding of its own (the list keeps 4px).
const comboboxPopupClass = cn(
  "group/combobox-content relative isolate z-(--z-overlay) flex max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) min-w-[calc(var(--anchor-width)+(--spacing(7)))] flex-col overflow-hidden data-[chips=true]:min-w-(--anchor-width)",
  overlaySurface,
  popupMotionClass,
);

function ComboboxContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset" | "anchor"
  >) {
  const container = useQuartzPortal();
  return (
    <ComboboxPrimitive.Portal container={container}>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        collisionPadding={8}
        className="isolate z-(--z-overlay) outline-none"
      >
        <InPopupContext.Provider value={true}>
          <ComboboxPrimitive.Popup
            data-slot="combobox-content"
            data-chips={!!anchor}
            className={mergeClass(comboboxPopupClass, className)}
            {...props}
          />
        </InPopupContext.Provider>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

// At most --popup-max tall, and never past the room left under a search row (--row).
const listMaxHeightClass = "max-h-[min(var(--popup-max),calc(var(--available-height)-var(--row)))]";

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={mergeClass(
        [
          "scroll-fade-y scroll-py-1 overflow-y-auto overscroll-contain p-1 data-empty:p-0",
          listMaxHeightClass,
        ],
        className,
      )}
      {...props}
    />
  );
}

function ComboboxItem({ className, children, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={mergeClass(listItemClass, className)}
      {...props}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <ComboboxPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute end-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

function ComboboxGroup({ className, ...props }: ComboboxPrimitive.Group.Props) {
  return <ComboboxPrimitive.Group data-slot="combobox-group" className={className} {...props} />;
}

function ComboboxLabel({ className, ...props }: ComboboxPrimitive.GroupLabel.Props) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      className={mergeClass(menuLabelClass, className)}
      {...props}
    />
  );
}

function ComboboxCollection({ ...props }: ComboboxPrimitive.Collection.Props) {
  return <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />;
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={mergeClass(
        "hidden w-full px-3 py-3 type-label text-text-2 group-data-empty/combobox-content:flex",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxSeparator({ className, ...props }: ComboboxPrimitive.Separator.Props) {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      className={mergeClass(menuSeparatorClass, className)}
      {...props}
    />
  );
}

/** The multiple-value field: chips and an input in one wrapping field box. Pass its ref as the popup anchor. */
function ComboboxChips({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> & ComboboxPrimitive.Chips.Props) {
  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      className={mergeClass(
        [
          fieldBoxClass,
          "h-auto max-h-(--field-max-height) min-h-(--control) cursor-text flex-wrap gap-1 overflow-y-auto p-1",
        ],
        className,
      )}
      {...props}
    />
  );
}

function ComboboxChip({
  className,
  children,
  showRemove = true,
  removeLabel,
  ...props
}: ComboboxPrimitive.Chip.Props & {
  showRemove?: boolean;
  /**
   * Accessible name for the remove button. Defaults to `Remove {children}` when
   * the chip's label is a plain string; pass it when the label is markup, so a
   * list of chips does not read as a row of identical "Remove selection"s.
   */
  removeLabel?: string;
}) {
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      className={mergeClass(
        [
          "flex h-6 max-w-full min-w-0 items-center gap-1 rounded-inner bg-page ps-2 type-label-sm text-text-1 control-edge outline-none forced-colors:border",
          // The person's hand on a chip (highlighted or focused): ink, and its ring is paper.
          "data-highlighted:bg-inverse data-highlighted:text-text-inverse data-highlighted:shadow-none focus-within:bg-inverse focus-within:text-text-inverse focus-within:shadow-none focus-visible:focus-ring-ink",
          "has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:text-text-disabled",
          showRemove ? "pe-0" : "pe-2",
        ],
        className,
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      {showRemove && (
        <ComboboxPrimitive.ChipRemove
          data-slot="combobox-chip-remove"
          aria-label={
            removeLabel ??
            (typeof children === "string" ? `Remove ${children}` : "Remove selection")
          }
          className="flex size-6 shrink-0 items-center justify-center rounded-inner text-text-2 transition-colors duration-(--dur-fast) ease-(--ease-step) hover:bg-hover hover:text-text-1 motion-reduce:transition-none"
        >
          <XIcon className="pointer-events-none size-3" />
        </ComboboxPrimitive.ChipRemove>
      )}
    </ComboboxPrimitive.Chip>
  );
}

function ComboboxChipsInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      data-control=""
      className={mergeClass(
        // With no chip before it, the text starts where an Input's does, past the box's 4px padding.
        "h-6 min-w-16 flex-1 bg-transparent ps-1 type-label outline-none placeholder:text-text-3 first:ps-2 disabled:cursor-not-allowed pointer-coarse:text-base",
        className,
      )}
      {...props}
    />
  );
}

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null);
}

export {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxClear,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
  listMaxHeightClass,
  useComboboxAnchor,
};
