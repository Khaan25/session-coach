"use client";

import * as React from "react";
import { cn } from "cn";

// What Dialog and Sheet share: the open state, the backdrop, and the
// edge fade on a scrolling body. Every overlay (dialogs, sheet, drawer, popover, menus, select, combobox) imports from here, so the behaviour is written once. Every
// overlay, anchored or modal, also takes its look from here: one surface and one way to appear.

// ---------- Open state ----------

/**
 * Open state, controlled or not, for an overlay's Root. Pass setOpen as the Root's onOpenChange.
 */
function useOverlayOpen<D>({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: D) => void;
}) {
  const [openState, setOpenState] = React.useState(defaultOpen);
  const open = openProp ?? openState;
  const setOpen = React.useCallback(
    (next: boolean, details: D) => {
      if (openProp === undefined) setOpenState(next);
      onOpenChange?.(next, details);
    },
    [openProp, onOpenChange],
  );
  return { open, setOpen };
}

// ---------- Looks ----------

/**
 * Paper, the 10px frame corner, the 1px frame edge and one short shadow (both in --elev-overlay), and a CanvasText outline in
 * forced colors. Never the frame utility: overlays scroll, and a ::before inside a scroller scrolls away with it.
 */
const overlaySurface =
  "rounded-frame bg-page text-text-1 shadow-overlay outline-none forced-colors:outline-solid forced-colors:outline-1 forced-colors:outline-[CanvasText]";

/**
 * overlaySurface as a shell, for an overlay with a title and a body (dialog, sheet): the panel grey in place of paper, with the
 * same ring and shadow. Its title and actions sit on the grey and its body sits in a white inset.
 */
const overlayShellSurface = overlaySurface.replace("bg-page", "bg-(--surface-frame)");

/** Appears, never grows: opacity only, in on --dur-base, out on --dur-fast, both on the step curve. */
const overlayMotion =
  "transition-opacity duration-(--dur-base) ease-(--ease-step) data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-(--dur-fast) motion-reduce:transition-none";

/** The 24% ink backdrop behind every modal overlay. */
const backdropClass = cn(
  "fixed inset-0 z-(--z-overlay) bg-overlay",
  "transition-opacity duration-(--dur-slow) ease-(--ease-step) data-ending-style:opacity-0 data-ending-style:duration-(--dur-base) data-starting-style:opacity-0",
);

// ---------- The scroll fade ----------

/**
 * Sets data-fade on a scroller to start, end, both or nothing, from where it is scrolled. fadeClass
 * turns that into a --fade-edge mask at each edge that has more content behind it, so a fade always means
 * "more here". `focusable` gives the scroller a tab stop while it has something to scroll.
 */
function useScrollFade<E extends HTMLElement>({ focusable = false }: { focusable?: boolean } = {}) {
  const ref = React.useRef<E | null>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const start = el.scrollTop > 1;
      const end = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
      const fade = start && end ? "both" : start ? "start" : end ? "end" : "";
      if (fade) el.dataset.fade = fade;
      else delete el.dataset.fade;
      if (focusable) {
        if (el.scrollHeight > el.clientHeight + 1) el.tabIndex = 0;
        else el.removeAttribute("tabindex");
      }
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const observeChildren = () => {
      for (const child of Array.from(el.children)) ro.observe(child);
    };
    observeChildren();
    // Content that changes without resizing the scroller (a filtered list) changes what is behind it, and
    // children added later must reach the ResizeObserver too.
    const mo = new MutationObserver(() => {
      observeChildren();
      update();
    });
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      mo.disconnect();
    };
  }, [focusable]);
  return ref;
}

const fadeClass = "fade-y";

export {
  useOverlayOpen,
  overlaySurface,
  overlayShellSurface,
  overlayMotion,
  backdropClass,
  useScrollFade,
  fadeClass,
};
