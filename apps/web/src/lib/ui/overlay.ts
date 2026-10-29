"use client";

import * as React from "react";
import { cn } from "cn";

// What Dialog and Sheet share: the open state that waits for a running action, the backdrop, and the
// edge fade on a scrolling body. Every overlay (dialogs, sheet, drawer, popover, menus, select, combobox) imports from here, so the behaviour is written once. Every
// overlay, anchored or modal, also takes its look from here: one surface and one way to appear.

// ---------- Open state and the pending block ----------

type ChangeDetails = { cancel: () => void };

/**
 * What the open state knows, apart from React. Every open and every close starts a new session, and a
 * run belongs to the session it started in, so a settle from an earlier session changes nothing.
 */
type OverlayModel = { open: boolean; session: number; pending: boolean; error: string | null };

const overlayModel = (open: boolean): OverlayModel => ({
  open,
  session: 0,
  pending: false,
  error: null,
});

/** Any promise-like value counts as pending, not only a native Promise. */
function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

/**
 * The overlay opened or closed, by the parent's prop or by itself. Opening starts clean, with no error.
 * Any close, the parent's included, ends the session, so a run still going is no longer this overlay's.
 */
function overlayOpenChanged(model: OverlayModel, open: boolean): OverlayModel {
  if (model.open === open) return model;
  return { open, session: model.session + 1, pending: false, error: open ? null : model.error };
}

/** Whether a request to close goes through. While a run is pending nothing closes the overlay. */
function overlayMayClose(model: OverlayModel) {
  return !model.pending;
}

/** A run starts. Refused while one is pending; the error clears. */
function overlayRunStarted(model: OverlayModel): OverlayModel | null {
  if (model.pending) return null;
  return { ...model, pending: true, error: null };
}

type RunOutcome = { ok: true } | { ok: false; error: string };

/**
 * A run settled. Ignored unless it belongs to the current session and that session still waits on it.
 * Success asks to close when closeAfter; failure keeps the message as the error.
 */
function overlayRunSettled(
  model: OverlayModel,
  session: number,
  outcome: RunOutcome,
  closeAfter: boolean,
): { model: OverlayModel; close: boolean } {
  if (session !== model.session || !model.pending) return { model, close: false };
  if (outcome.ok) return { model: { ...model, pending: false }, close: closeAfter && model.open };
  return { model: { ...model, pending: false, error: outcome.error }, close: false };
}

const FAILED = "That did not work. Nothing changed.";
const messageOf = (e: unknown) =>
  e instanceof Error ? e.message : typeof e === "string" && e ? e : FAILED;

/** Base UI's change details for a close the overlay asks for itself, after an action finished. */
function ownDetails<D extends ChangeDetails>(): D {
  const details = {
    reason: "imperative-action",
    event: new Event("overlay"),
    trigger: undefined,
    isCanceled: false,
    isPropagationAllowed: false,
    cancel() {
      details.isCanceled = true;
    },
    allowPropagation() {
      details.isPropagationAllowed = true;
    },
    preventUnmountOnClose() {},
  };
  return details as unknown as D;
}

/**
 * Open state, controlled or not, and the pending block. run() calls an action; a returned thenable
 * sets pending until it settles, and while pending setOpen(false) is refused, so Escape, a swipe, the
 * backdrop, Close and the X all wait. It closes after success when asked and keeps the rejection's
 * message as the error. `session` changes on every open and close, whichever side opened it, so state
 * that belongs to one open (a typed confirm) resets by keying on it.
 */
function useOverlayOpen<D extends ChangeDetails>({
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
  const [model, setModel] = React.useState(() => overlayModel(open));
  const modelRef = React.useRef(model);
  const commit = React.useCallback((next: OverlayModel) => {
    if (next === modelRef.current) return;
    modelRef.current = next;
    setModel(next);
  }, []);
  const latest = React.useRef({ controlled: openProp !== undefined, onOpenChange });
  React.useLayoutEffect(() => {
    latest.current = { controlled: openProp !== undefined, onOpenChange };
  });
  // The transition of open, from the prop or from inside, starts a new session.
  React.useLayoutEffect(() => {
    commit(overlayOpenChanged(modelRef.current, open));
  }, [open, commit]);

  const setOpen = React.useCallback((next: boolean, details?: D) => {
    const full = details ?? ownDetails<D>();
    // The action is running: nothing closes the overlay until it settles (trap/overlay-pending-dismiss).
    if (!next && !overlayMayClose(modelRef.current)) {
      full.cancel();
      return;
    }
    if (!latest.current.controlled) setOpenState(next);
    latest.current.onOpenChange?.(next, full);
  }, []);

  const run = React.useCallback(
    (action: () => unknown, closeAfter: boolean) => {
      const started = overlayRunStarted(modelRef.current);
      if (!started) return;
      let result: unknown;
      try {
        result = action();
      } catch (e) {
        commit({ ...modelRef.current, error: messageOf(e) });
        return;
      }
      if (!isThenable(result)) {
        commit({ ...modelRef.current, error: null });
        if (closeAfter) setOpen(false);
        return;
      }
      commit(started);
      const settle = (outcome: RunOutcome) => {
        const { model: next, close } = overlayRunSettled(
          modelRef.current,
          started.session,
          outcome,
          closeAfter,
        );
        commit(next);
        if (close) setOpen(false);
      };
      result.then(
        () => settle({ ok: true }),
        (e: unknown) => settle({ ok: false, error: messageOf(e) }),
      );
    },
    [commit, setOpen],
  );

  return { open, setOpen, pending: model.pending, error: model.error, session: model.session, run };
}

/**
 * Whether a primary action closes its overlay. With onAction it closes after the action settles.
 * Without one, a bare action is a "done" and closes, as a plain confirm button does; an onClick
 * or a form submit owns what happens next, so those stay open.
 */
function closesAfter({
  close,
  onAction,
  onClick,
  type,
}: {
  close?: boolean;
  onAction?: unknown;
  onClick?: unknown;
  type?: string;
}) {
  return close ?? (onAction !== undefined || (onClick === undefined && type !== "submit"));
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
  overlayModel,
  overlayOpenChanged,
  overlayMayClose,
  overlayRunStarted,
  overlayRunSettled,
  isThenable,
  closesAfter,
  overlaySurface,
  overlayShellSurface,
  overlayMotion,
  backdropClass,
  useScrollFade,
  fadeClass,
};
