"use client";

import * as React from "react";
import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import {
  CheckCircleIcon,
  InfoIcon,
  SpinnerIcon,
  WarningIcon,
  XCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { tooltipPopupClass } from "@/components/ui/tooltip";
import { usePortalContainer } from "@/lib/ui/portal";

// The design system's toast look (paper, the frame corner, the overlay edge and shadow, a label title over a body-sm line,
// the title in the warn or fail text colour) on the zip's stack: toasts pile up behind the newest, fan out on
// hover, swipe away, and pulse when they update in place.

const toast = ToastPrimitive.createToastManager();

function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />;
}

function ToastPortal({ ...props }: ToastPrimitive.Portal.Props) {
  const container = usePortalContainer();
  return <ToastPrimitive.Portal data-slot="toast-portal" container={container} {...props} />;
}

function ToastViewport({ className, ...props }: ToastPrimitive.Viewport.Props) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        // Full width less the phone gutter at the bottom; from 640px, the toast width in the bottom-end corner.
        "pointer-events-none fixed inset-x-(--gutter-sm) bottom-[max(var(--gutter-sm),env(safe-area-inset-bottom))] z-(--z-overlay) mx-auto w-auto max-w-toast outline-none sm:start-auto sm:end-(--gutter) sm:bottom-(--gutter) sm:mx-0 sm:w-full",
        className,
      )}
      {...props}
    />
  );
}

/* Anchored toasts are placed by their positioner, so this viewport claims no corner of its own. */
function AnchoredToastViewport({ className, ...props }: ToastPrimitive.Viewport.Props) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn("outline-none", className)}
      {...props}
    />
  );
}

function Toast({ className, ...props }: ToastPrimitive.Root.Props) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        "group/toast pointer-events-auto absolute end-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom rounded-frame bg-page text-text-1 shadow-overlay will-change-transform outline-none select-none focus-visible:focus-ring motion-safe:data-[pulse=even]:animate-toast-pulse-even motion-safe:data-[pulse=odd]:animate-toast-pulse-odd forced-colors:outline-1 forced-colors:outline-solid",
        "[--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]",
        "h-(--height) transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] [transition:transform_500ms_var(--ease-out-quint),opacity_500ms,height_150ms]",
        "after:absolute after:start-0 after:top-full after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
        "data-expanded:h-(--toast-height) data-expanded:transform-[translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",
        "data-limited:opacity-0 data-starting-style:transform-[translateY(150%)]",
        "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:transform-[translateY(150%)]",
        "data-ending-style:data-[swipe-direction=down]:transform-[translateY(calc(var(--toast-swipe-movement-y)+150%))]",
        "data-ending-style:data-[swipe-direction=left]:transform-[translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
        "data-ending-style:data-[swipe-direction=right]:transform-[translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        "data-ending-style:data-[swipe-direction=up]:transform-[translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        "data-expanded:data-ending-style:data-[swipe-direction=down]:transform-[translateY(calc(var(--toast-swipe-movement-y)+150%))]",
        "data-expanded:data-ending-style:data-[swipe-direction=left]:transform-[translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
        "data-expanded:data-ending-style:data-[swipe-direction=right]:transform-[translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        "data-expanded:data-ending-style:data-[swipe-direction=up]:transform-[translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        className,
      )}
      {...props}
    />
  );
}

function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      className={cn(
        "flex h-full items-start gap-3 overflow-hidden py-3 ps-4 pe-2 transition-opacity duration-250 ease-out-quint data-behind:opacity-0 data-expanded:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn(
        // Warn and fail name the trouble in the title, in the status text colour.
        "type-label break-words group-data-[toast-type=error]/toast:text-fail-text group-data-[toast-type=warning]/toast:text-warn-text",
        className,
      )}
      {...props}
    />
  );
}

function ToastDescription({ className, ...props }: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("type-body-sm break-words text-text-2 empty:hidden", className)}
      {...props}
    />
  );
}

function ToastAction({
  className,
  render = <Button variant="secondary" size="xs" />,
  ...props
}: ToastPrimitive.Action.Props) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      render={render}
      // 24px tall on a 16px title line: -my-1 centres it on that line without making the row taller.
      className={cn("-my-1 shrink-0", className)}
      {...props}
    />
  );
}

function ToastClose({
  className,
  children,
  render = <Button variant="ghost" size="icon-xs" />,
  ...props
}: ToastPrimitive.Close.Props) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Close toast"
      render={render}
      className={cn(
        "relative -my-1 shrink-0 text-text-2 after:absolute after:-inset-2 after:content-[''] hover:text-text-1",
        className,
      )}
      {...props}
    >
      {children ?? <XIcon aria-hidden="true" />}
    </ToastPrimitive.Close>
  );
}

function ToastIcon({ type }: { type: string | undefined }) {
  let icon: React.ReactNode = null;

  if (type === "success") {
    icon = <CheckCircleIcon aria-hidden="true" />;
  }

  if (type === "info") {
    icon = <InfoIcon aria-hidden="true" />;
  }

  if (type === "warning") {
    icon = <WarningIcon className="text-warn-text" aria-hidden="true" />;
  }

  if (type === "error") {
    icon = <XCircleIcon className="text-fail-text" aria-hidden="true" />;
  }

  if (type === "loading") {
    icon = (
      <SpinnerIcon
        className="animate-spin motion-reduce:[animation-duration:3s]"
        aria-hidden="true"
      />
    );
  }

  if (!icon) {
    return null;
  }

  return (
    <span
      data-slot="toast-icon"
      className="flex h-4 shrink-0 items-center text-text-2 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4"
    >
      {icon}
    </span>
  );
}

/*
 * An anchored toast is a tooltip that happens to be driven by the toast manager:
 * it points at one control and says one short thing. It borrows `tooltip.tsx`'s
 * design rather than the stacked toast's card, which would cover the thing it is
 * pointing at.
 */
function AnchoredToast({ className, ...props }: ToastPrimitive.Root.Props) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      data-surface="inverse"
      className={cn(
        tooltipPopupClass,
        "pointer-events-auto z-[calc(1000-var(--toast-index))] w-max origin-(--transform-origin) duration-150 ease-out-quint outline-none select-none data-ending-style:animate-out data-ending-style:duration-100 data-ending-style:fade-out-0 data-ending-style:zoom-out-95 data-starting-style:animate-in data-starting-style:fade-in-0 data-starting-style:zoom-in-95",
        className,
      )}
      {...props}
    />
  );
}

/* The design system's tooltip has no arrow, so the anchored toast list leaves this out; it stays for callers that want one. */
function ToastArrow({ className, ...props }: ToastPrimitive.Arrow.Props) {
  return (
    <ToastPrimitive.Arrow
      data-slot="toast-arrow"
      className={cn(
        "z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px] bg-page data-[side=bottom]:top-1 data-[side=inline-end]:-start-1 data-[side=inline-end]:top-1/2! data-[side=inline-end]:-translate-y-1/2 data-[side=inline-start]:-end-1 data-[side=inline-start]:top-1/2! data-[side=inline-start]:-translate-y-1/2 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5",
        className,
      )}
      {...props}
    />
  );
}

function ToastPositioner({ className, ...props }: ToastPrimitive.Positioner.Props) {
  return (
    <ToastPrimitive.Positioner
      data-slot="toast-positioner"
      className={cn("pointer-events-none z-[calc(1000-var(--toast-index))]", className)}
      {...props}
    />
  );
}

/*
 * `updateKey` counts in-place updates and starts at 0, so a first add does not pulse. Even and odd swap the
 * animation name, which is what re-runs it (see globals.css); Toast maps data-pulse to the two classes.
 */
function pulseOf(updateKey: number | undefined) {
  if (!updateKey) {
    return undefined;
  }

  return updateKey % 2 === 0 ? "even" : "odd";
}

function ToastRow({ toast: toastItem }: { toast: ToastPrimitive.Root.Props["toast"] }) {
  return (
    <Toast
      toast={toastItem}
      data-pulse={pulseOf(toastItem?.updateKey)}
      data-toast-type={toastItem?.type}
    >
      <ToastContent>
        <ToastIcon type={toastItem?.type} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <ToastTitle />
          <ToastDescription />
        </div>
        <ToastAction />
        <ToastClose />
      </ToastContent>
    </Toast>
  );
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();

  return toasts.map((toastItem) => <ToastRow key={toastItem.id} toast={toastItem} />);
}

/* Anchored toasts are placed against an element, so each needs its own positioner. */
function AnchoredToastList() {
  const { toasts } = ToastPrimitive.useToastManager();

  return toasts.map((toastItem) => (
    <ToastPositioner key={toastItem.id} toast={toastItem} {...toastItem.positionerProps}>
      <AnchoredToast toast={toastItem}>
        <ToastContent className="items-center gap-2 p-0">
          <ToastIcon type={toastItem.type} />
          <ToastDescription className="type-label-sm text-text-1" />
        </ToastContent>
      </AnchoredToast>
    </ToastPositioner>
  ));
}

function Toaster({
  children,
  toastManager = toast,
  viewportClassName,
  anchored = false,
  ...props
}: ToastPrimitive.Provider.Props & {
  // Anchored and stacked toasts need different viewports, so they need different managers - see Base UI's toast docs.
  anchored?: boolean;
  // Overrides the default bottom-end corner; pass the full inset set, since `cn` only drops what it recognises as conflicting.
  viewportClassName?: string;
}) {
  return (
    <ToastProvider toastManager={toastManager} {...props}>
      {children}
      <ToastPortal>
        {anchored ? (
          <AnchoredToastViewport className={viewportClassName}>
            <AnchoredToastList />
          </AnchoredToastViewport>
        ) : (
          <ToastViewport className={viewportClassName}>
            <ToastList />
          </ToastViewport>
        )}
      </ToastPortal>
    </ToastProvider>
  );
}

const createToastManager = ToastPrimitive.createToastManager;
const useToastManager = ToastPrimitive.useToastManager;

export {
  Toaster,
  AnchoredToast,
  AnchoredToastViewport,
  Toast,
  ToastAction,
  ToastArrow,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastPositioner,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  createToastManager,
  toast,
  useToastManager,
};
