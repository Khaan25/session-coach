"use client";

import * as React from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { CaretRightIcon, CheckIcon } from "@phosphor-icons/react";
import { cn } from "cn";

import { overlaySurface } from "@/lib/ui/overlay";
import { usePortalContainer } from "@/lib/ui/portal";
import { mergeClass } from "@/lib/ui/utils";

// The design system's look (paper, the frame radius, the overlay shadow, 4px inset, 32px rows in the label role) on the zip's motion:
// the popup grows from its trigger (origin-(--transform-origin)) with a fade, a 95% zoom and a 2-step slide away from the
// side it opened on. The design system's own opacity-only overlayMotion is left out, the zip's motion wins.
// Select and combobox reuse these classes, so every list popup moves and looks the same.
const popupMotionClass =
  "origin-(--transform-origin) duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-start-2 data-[side=inline-start]:slide-in-from-end-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95";

// The popup takes focus when a menu opens by keyboard with nothing highlighted; menu-popup opts it out of the ring,
// the highlighted item is the focus indicator.
const menuPopupClass = cn("menu-popup", overlaySurface, popupMotionClass);

// A destructive item reads in the fail word at rest and takes the fail wash when highlighted (menu-item does both).
const menuItemClass =
  "group/dropdown-menu-item menu-item data-inset:ps-8 [&_svg:not([class*='size-'])]:size-4";

// Checkbox and radio items reserve the 32px leading column for their indicator.
const menuCheckItemClass = cn(menuItemClass, "ps-8");

const menuLabelClass = "menu-label data-inset:ps-8";
const menuSeparatorClass = "menu-separator";

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({ ...props }: MenuPrimitive.Portal.Props) {
  const container = usePortalContainer();
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" container={container} {...props} />;
}

function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

type DropdownMenuContentProps = MenuPrimitive.Popup.Props &
  Pick<
    MenuPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "collisionPadding"
  >;

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 6,
  collisionPadding = 8,
  className,
  ...props
}: DropdownMenuContentProps) {
  return (
    <DropdownMenuPortal>
      <MenuPrimitive.Positioner
        className="isolate z-(--z-overlay) outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={mergeClass(menuPopupClass, className)}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </DropdownMenuPortal>
  );
}

function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: MenuPrimitive.GroupLabel.Props & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset || undefined}
      className={mergeClass(menuLabelClass, className)}
      {...props}
    />
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: MenuPrimitive.Item.Props & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset || undefined}
      data-variant={variant}
      className={mergeClass(menuItemClass, className)}
      {...props}
    />
  );
}

/** An item that navigates: a real link, so open in a new tab and copy link work. */
function DropdownMenuLinkItem({
  className,
  inset,
  ...props
}: MenuPrimitive.LinkItem.Props & { inset?: boolean }) {
  return (
    <MenuPrimitive.LinkItem
      data-slot="dropdown-menu-link-item"
      data-inset={inset || undefined}
      className={mergeClass([menuItemClass, "cursor-pointer"], className)}
      {...props}
    />
  );
}

function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset || undefined}
      className={mergeClass(
        [
          menuItemClass,
          "data-popup-open:bg-hover forced-colors:data-popup-open:outline-solid forced-colors:data-popup-open:outline-1 forced-colors:data-popup-open:-outline-offset-1",
        ],
        className,
      )}
      {...props}
    >
      {children}
      <CaretRightIcon className="ms-auto text-text-3 rtl:-scale-x-100" />
    </MenuPrimitive.SubmenuTrigger>
  );
}

function DropdownMenuSubContent({
  align = "start",
  alignOffset = -4,
  side = "inline-end",
  sideOffset = 2,
  className,
  ...props
}: DropdownMenuContentProps) {
  return (
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      className={className}
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  inset,
  ...props
}: MenuPrimitive.CheckboxItem.Props & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset || undefined}
      className={mergeClass(menuCheckItemClass, className)}
      {...props}
    >
      <span
        className="pointer-events-none absolute start-2 flex size-4 items-center justify-center"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <MenuPrimitive.CheckboxItemIndicator>
          <CheckIcon />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
  return <MenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: MenuPrimitive.RadioItem.Props & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset || undefined}
      className={mergeClass(menuCheckItemClass, className)}
      {...props}
    >
      <span
        className="pointer-events-none absolute start-2 flex size-4 items-center justify-center"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        {/* The chosen option is a filled 8px square, the design system's radio dot. */}
        <MenuPrimitive.RadioItemIndicator className="size-(--mark-size) bg-ink forced-colors:bg-[CanvasText]" />
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

function DropdownMenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={mergeClass(menuSeparatorClass, className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn("ms-auto ps-4 type-label-sm text-text-3", className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  menuCheckItemClass,
  menuItemClass,
  menuLabelClass,
  menuPopupClass,
  menuSeparatorClass,
  popupMotionClass,
};
