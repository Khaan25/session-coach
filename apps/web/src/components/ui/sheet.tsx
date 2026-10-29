"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "@phosphor-icons/react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { fadeClass, useOverlayOpen, useScrollFade } from "@/lib/quartz/overlay";
import { useQuartzModal, useQuartzPortal } from "@/lib/quartz/portal";
import { mergeRefs } from "@/lib/quartz/utils";

// A panel from an edge. Quartz's shell (the panel grey holding one white card: the header, then SheetBody under it,
// the actions back on the grey) with the zip's slide. The slide is a `translate` in the starting and ending states;
// globals.css resets it under reduced motion through [data-slot="sheet-content"], so keep that slot name.

// Open and modal: the page behind is inert while it is true (useQuartzModal).
const SheetLockContext = React.createContext(false);

function Sheet({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  modal = true,
  ...props
}: SheetPrimitive.Root.Props) {
  const { open, setOpen } = useOverlayOpen<SheetPrimitive.Root.ChangeEventDetails>({
    open: openProp,
    defaultOpen,
    onOpenChange,
  });

  return (
    <SheetLockContext.Provider value={open && modal === true}>
      <SheetPrimitive.Root
        data-slot="sheet"
        open={open}
        onOpenChange={setOpen}
        modal={modal}
        {...props}
      />
    </SheetLockContext.Provider>
  );
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  const container = useQuartzPortal();
  return <SheetPrimitive.Portal data-slot="sheet-portal" container={container} {...props} />;
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-(--z-overlay) bg-overlay transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left";
  showCloseButton?: boolean;
}) {
  useQuartzModal(React.useContext(SheetLockContext));

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        data-show-close={showCloseButton || undefined}
        className={cn(
          // Quartz's panel: the shell grey, the overlay edge and shadow; 480px, with 40px of page showing on phones.
          "group/sheet fixed z-(--z-overlay) flex min-h-0 flex-col bg-(--surface-frame) text-text-1 shadow-overlay outline-none forced-colors:outline-1 forced-colors:outline-[CanvasText] forced-colors:outline-solid",
          "data-[side=left]:w-[calc(100%-var(--space-10))] data-[side=right]:w-[calc(100%-var(--space-10))] data-[side=left]:sm:w-overlay data-[side=right]:sm:w-overlay",
          "data-[side=bottom]:max-h-[calc(100dvh-var(--space-10))] data-[side=bottom]:rounded-t-frame data-[side=bottom]:pb-[env(safe-area-inset-bottom)] data-[side=top]:max-h-[calc(100dvh-var(--space-10))] data-[side=top]:rounded-b-frame",
          // The zip's slide: 2.5rem in from its edge on the out curve, out a step faster, mirrored under rtl.
          "transition-[opacity,translate] duration-200 ease-out-quint data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem] data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem] rtl:data-[side=left]:data-ending-style:translate-x-[2.5rem] rtl:data-[side=left]:data-starting-style:translate-x-[2.5rem] rtl:data-[side=right]:data-ending-style:translate-x-[-2.5rem] rtl:data-[side=right]:data-starting-style:translate-x-[-2.5rem]",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            aria-label="Close"
            render={
              // Corner placement, so nothing can collide with the 8px hit-area extension.
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute end-4 top-5 z-(--z-raised) after:absolute after:-inset-2"
              />
            }
          >
            <XIcon />
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

/**
 * The top of the sheet's one white card, 4px in from the grey: the title over its description. With a SheetBody
 * under it the card goes on with no line between.
 */
function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        "frame mx-1 mt-1 flex shrink-0 flex-col gap-1.5 bg-page p-5 [--frame-radius:calc(var(--radius-frame)-4px)] group-data-show-close/sheet:pe-14",
        "group-has-data-[slot=sheet-inset]/sheet:pb-0 group-has-data-[slot=sheet-inset]/sheet:[--frame-radius:calc(var(--radius-frame)-4px)_calc(var(--radius-frame)-4px)_0_0] group-has-data-[slot=sheet-inset]/sheet:before:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The scrolling middle, in the white inset that continues the header's card. The inset does not scroll; the body
 * inside it does, and fades only at an edge with more to scroll.
 */
function SheetBody({ className, ref, ...props }: React.ComponentProps<"div">) {
  const fade = useScrollFade<HTMLDivElement>({ focusable: true });
  const setRef = React.useMemo(() => mergeRefs(fade, ref), [fade, ref]);

  return (
    <div
      data-slot="sheet-inset"
      className="frame mx-1 mb-1 flex min-h-0 flex-1 flex-col bg-page [--frame-radius:calc(var(--radius-frame)-4px)] group-has-data-[slot=sheet-footer]/sheet:mb-0 group-has-data-[slot=sheet-header]/sheet:[--frame-radius:0_0_calc(var(--radius-frame)-4px)_calc(var(--radius-frame)-4px)] group-has-data-[slot=sheet-header]/sheet:before:border-t-0"
    >
      <div
        ref={setRef}
        data-slot="sheet-body"
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-5 group-has-data-[slot=sheet-header]/sheet:pt-6 focus-visible:focus-ring-inset",
          fadeClass,
          className,
        )}
        {...props}
      />
    </div>
  );
}

/** The actions, back on the shell's grey. */
function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto frame-foot shrink-0 flex-wrap justify-end", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("type-heading-xs break-words text-text-1", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("type-body text-text-2", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
