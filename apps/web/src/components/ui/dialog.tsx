"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "@phosphor-icons/react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { overlayShellSurface, useOverlayOpen } from "@/lib/quartz/overlay";
import { useQuartzModal, useQuartzPortal } from "@/lib/quartz/portal";

// Quartz's look (the grey shell holding one white card: header on top, DialogBody under it, the actions back on
// the grey) with the zip's motion: a 95% scale-in on open, and nested dialogs that recede and dim their parent.

// Open and modal: the page behind is inert while it is true (useQuartzModal).
const DialogLockContext = React.createContext(false);

function Dialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  modal = true,
  ...props
}: DialogPrimitive.Root.Props) {
  const { open, setOpen } = useOverlayOpen<DialogPrimitive.Root.ChangeEventDetails>({
    open: openProp,
    defaultOpen,
    onOpenChange,
  });

  return (
    <DialogLockContext.Provider value={open && modal === true}>
      <DialogPrimitive.Root
        data-slot="dialog"
        open={open}
        onOpenChange={setOpen}
        modal={modal}
        {...props}
      />
    </DialogLockContext.Provider>
  );
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  const container = useQuartzPortal();
  return <DialogPrimitive.Portal data-slot="dialog-portal" container={container} {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-(--z-overlay) bg-overlay duration-200 ease-out-quint data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:duration-150 data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

// Base UI's `--nested-dialogs` / `data-nested-dialog-open`: a parent recedes and dims rather than being covered.
const NESTED_STACK =
  "translate-y-[calc(1.25rem*var(--nested-dialogs))] scale-[calc(1-0.1*var(--nested-dialogs))] transition-[translate,scale] after:pointer-events-none after:absolute after:inset-0 after:z-(--z-cover) after:rounded-[inherit] after:bg-overlay after:opacity-0 after:transition-opacity after:duration-200 data-nested-dialog-open:after:opacity-100";

function DialogContent({
  className,
  children,
  showCloseButton = true,
  size = "default",
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
  /** sm 400px, default 480px, lg 640px. */
  size?: "sm" | "default" | "lg";
}) {
  useQuartzModal(React.useContext(DialogLockContext));

  return (
    <DialogPortal>
      <DialogOverlay />
      {/* Bounds every popup, so the footer cannot leave the screen when content outgrows the window. */}
      <DialogPrimitive.Viewport
        data-slot="dialog-viewport"
        className="fixed inset-0 z-(--z-overlay) flex items-center justify-center overflow-hidden p-(--gutter-sm)"
      >
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          data-size={size}
          data-close={showCloseButton || undefined}
          className={cn(
            // `overflow-y-auto` is the fallback; a child with `flex-auto min-h-0` scrolls instead, so there is only ever one scrollbar.
            "group/dialog relative flex max-h-full min-h-0 w-full flex-col overflow-y-auto overscroll-contain data-[size=default]:max-w-overlay data-[size=lg]:max-w-overlay-lg data-[size=sm]:max-w-overlay-sm *:data-[slot=scroll-area]:mx-1 *:data-[slot=scroll-area]:mt-1",
            overlayShellSurface,
            "duration-200 ease-out-quint data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:duration-150 data-closed:fade-out-0 data-closed:zoom-out-95",
            NESTED_STACK,
            className,
          )}
          {...props}
        >
          {children}
          {/* Last in the tab order, first in layout: a zero-height sticky strip keeps the X in the corner while a tall dialog scrolls. */}
          {showCloseButton && (
            <div
              data-slot="dialog-close-anchor"
              className="pointer-events-none sticky top-0 z-(--z-above) order-first h-0"
            >
              <DialogPrimitive.Close
                data-slot="dialog-close"
                aria-label="Close"
                render={
                  // `after:-inset-2` widens the hit area; safe only because nothing sits beside it.
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="pointer-events-auto absolute end-4 top-5 after:absolute after:-inset-2"
                  />
                }
              >
                <XIcon />
              </DialogPrimitive.Close>
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPortal>
  );
}

/**
 * The top of the dialog's one white card, 4px in from the grey shell: the title over its description. With a
 * DialogBody under it the card goes on with no line between. Sticky, so a tall dialog scrolls under it.
 */
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "frame sticky top-1 z-(--z-raised) mx-1 mt-1 grid grid-cols-1 gap-1.5 bg-page px-5 py-5 [--frame-radius:calc(var(--radius-frame)-4px)] group-data-close/dialog:pe-14",
        "group-has-data-[slot=dialog-body]/dialog:pb-0 group-has-data-[slot=dialog-body]/dialog:[--frame-radius:calc(var(--radius-frame)-4px)_calc(var(--radius-frame)-4px)_0_0] group-has-data-[slot=dialog-body]/dialog:before:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

/** The rest of the white card the header starts: the form, the preview, the content. */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        "frame mx-1 mb-1 flex min-w-0 flex-col gap-4 bg-page p-5 pt-6 [--frame-radius:0_0_calc(var(--radius-frame)-4px)_calc(var(--radius-frame)-4px)] group-has-data-[slot=dialog-footer]/dialog:mb-0 before:border-t-0",
        className,
      )}
      {...props}
    />
  );
}

/** The actions, back on the shell's grey. Sticky, so they stay reachable while a tall dialog scrolls. */
function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "sticky bottom-0 z-(--z-raised) frame-foot flex-col-reverse items-stretch bg-(--surface-frame) sm:flex-row sm:flex-wrap sm:items-center sm:justify-end",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>Close</DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("type-heading-xs break-words text-text-1", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "type-body break-words text-text-2 [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-text-1",
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
