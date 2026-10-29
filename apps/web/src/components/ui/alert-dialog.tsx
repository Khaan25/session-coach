"use client";

import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { overlayShellSurface, useOverlayOpen } from "@/lib/ui/overlay";
import { useModalLock, usePortalContainer } from "@/lib/ui/portal";

// The design system's dialog shell for one question: the header alone is the white card, the actions sit on the grey. The
// motion is the zip's: a 95% scale-in, and a parent that recedes and dims under a nested dialog.

// An alert dialog is always modal, so the page behind is inert while it is open.
const AlertDialogOpenContext = React.createContext(false);

function AlertDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...props
}: AlertDialogPrimitive.Root.Props) {
  const { open, setOpen } = useOverlayOpen<AlertDialogPrimitive.Root.ChangeEventDetails>({
    open: openProp,
    defaultOpen,
    onOpenChange,
  });

  return (
    <AlertDialogOpenContext.Provider value={open}>
      <AlertDialogPrimitive.Root
        data-slot="alert-dialog"
        open={open}
        onOpenChange={setOpen}
        {...props}
      />
    </AlertDialogOpenContext.Provider>
  );
}

function AlertDialogTrigger({ ...props }: AlertDialogPrimitive.Trigger.Props) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogPortal({ ...props }: AlertDialogPrimitive.Portal.Props) {
  const container = usePortalContainer();
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" container={container} {...props} />
  );
}

function AlertDialogOverlay({ className, ...props }: AlertDialogPrimitive.Backdrop.Props) {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-(--z-overlay) bg-overlay duration-200 ease-out-quint data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:duration-150 data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogContent({
  className,
  size = "default",
  ...props
}: AlertDialogPrimitive.Popup.Props & {
  size?: "default" | "sm";
}) {
  useModalLock(React.useContext(AlertDialogOpenContext));

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        data-size={size}
        className={cn(
          "group/alert-dialog-content fixed inset-s-1/2 top-1/2 z-(--z-overlay) flex max-h-[calc(100%-var(--gutter-sm)*2)] w-[calc(100%-var(--gutter-sm)*2)] -translate-x-1/2 -translate-y-1/2 flex-col data-[size=default]:max-w-overlay-sm data-[size=sm]:max-w-popover rtl:translate-x-1/2",
          // A tall alert on a short screen scrolls instead of running past the viewport edges.
          "overflow-y-auto overscroll-contain",
          overlayShellSurface,
          "duration-200 ease-out-quint data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:duration-150 data-closed:fade-out-0 data-closed:zoom-out-95",
          "top-[calc(50%+1.25rem*var(--nested-dialogs))] scale-[calc(1-0.1*var(--nested-dialogs))] transition-[top,scale] after:pointer-events-none after:absolute after:inset-0 after:z-(--z-cover) after:rounded-[inherit] after:bg-overlay after:opacity-0 after:transition-opacity after:duration-200 data-nested-dialog-open:after:opacity-100",
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}

/** The question: the dialog's white card, 4px in from the grey shell, the title over its description. */
function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        "frame mx-1 mt-1 grid grid-rows-[auto_1fr] gap-1.5 bg-page p-5 [--frame-radius:calc(var(--radius-frame)-4px)] has-data-[slot=alert-dialog-media]:grid-cols-[auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-4",
        className,
      )}
      {...props}
    />
  );
}

/** The answers, back on the shell's grey. */
function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "frame-foot flex-col-reverse items-stretch group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogMedia({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn(
        "row-span-2 inline-flex size-8 items-center justify-center rounded-soft bg-well text-text-2 *:[svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn(
        "type-heading-xs break-words text-text-1 group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn(
        "type-body break-words text-text-2 group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2 [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-text-1",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Confirming button in an alert dialog's footer. Closes the dialog on click.
 *
 * `onClick` runs first, then the close. So an `async` handler closes the dialog
 * before it can fail - call `event.preventBaseUIHandler()` and drive `open`
 * yourself when the action can reject. (CLI ships a bare `Button` here; `add`
 * will revert this.)
 *
 * @example Awaited confirm - stay open until the server agrees, and show why it did not
 * <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
 *     {error && <AlertDialogDescription>{error}</AlertDialogDescription>}
 *     <AlertDialogCancel disabled={pending}>Keep it</AlertDialogCancel>
 *     <AlertDialogAction
 *         disabled={pending}
 *         onClick={async (event) => {
 *             event.preventBaseUIHandler();
 *             setPending(true);
 *             try {
 *                 await cancelContract(id);
 *                 setOpen(false);
 *             } catch {
 *                 setError("Could not cancel the contract. Try again.");
 *             } finally {
 *                 setPending(false);
 *             }
 *         }}
 *     >
 *         Cancel contract
 *     </AlertDialogAction>
 * </AlertDialog>
 */
function AlertDialogAction({
  className,
  variant = "default",
  size = "default",
  ...props
}: AlertDialogPrimitive.Close.Props &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-action"
      className={cn(className)}
      render={<Button variant={variant} size={size} />}
      {...props}
    />
  );
}

function AlertDialogCancel({
  className,
  variant = "secondary",
  size = "default",
  ...props
}: AlertDialogPrimitive.Close.Props &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      className={cn(className)}
      render={<Button variant={variant} size={size} />}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
