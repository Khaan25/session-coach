"use client";

import {
  createContext,
  createElement,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

// Where the design system's overlays portal to. Base UI portals to document.body by default, which sits outside
// the page root, so the tokens, the theme and the font never reach a popup. PortalProvider renders an
// empty [data-portal] element as the last child of the page root and hands it down; every overlay
// passes it to its Base UI Portal:
//
//   const container = usePortalContainer();
//   <PopoverPrimitive.Portal container={container}>...</PopoverPrimitive.Portal>
//
// The hook returns null until the element mounts (Base UI waits on null rather than falling back to
// body), and undefined outside the provider, where Base UI's own default applies.
//
// A provider plays one of two parts, from where it sits:
//
//   root   the first provider in the tree (app/layout.tsx). Its container is the last child of the page
//          root, a sibling of the page, so a modal can make the page inert without making itself inert.
//   stage  a provider inside another, such as the docs' Stage. Its container sits in
//          place after its children, so an overlay shown open in a specimen stays in its frame. A
//          stage is part of the page, so a modal inside it does not lock the page.
//
// Modal overlays call useModalLock(open). While any is open, every element outside the root's
// container, from the page root up to body, is inert: Tab, Shift+Tab, a click and a screen reader's virtual
// cursor cannot reach the page behind. Base UI's own aria-hidden is not enough here: it keeps every
// ancestor of an aria-live region visible, and the docs have live regions on most pages.

type PortalScope = {
  container: HTMLElement | null;
  /** Makes everything outside the root container inert; call the returned function to release. */
  lock: () => () => void;
};

const PortalContext = createContext<PortalScope | undefined>(undefined);

const noLock = () => () => {};

/** Sets inert on every element outside `keep`, from its parent up to body. Returns the undo. */
function inertOutside(keep: HTMLElement) {
  const set: HTMLElement[] = [];
  let node: HTMLElement | null = keep;
  while (node && node !== node.ownerDocument.body) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) break;
    for (const sibling of Array.from(parent.children)) {
      if (
        sibling === node ||
        !(sibling instanceof HTMLElement) ||
        sibling.inert ||
        sibling.tagName === "SCRIPT"
      )
        continue;
      sibling.inert = true;
      set.push(sibling);
    }
    node = parent;
  }
  return () => {
    for (const el of set) el.inert = false;
  };
}

export function PortalProvider({ children }: { children: ReactNode }) {
  const parent = useContext(PortalContext);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const count = useRef(0);
  const undo = useRef<(() => void) | null>(null);
  const role = parent ? "stage" : "root";

  const scope = useMemo<PortalScope>(() => {
    if (role === "stage") return { container, lock: noLock };
    return {
      container,
      lock: () => {
        count.current += 1;
        if (count.current === 1 && container) undo.current = inertOutside(container);
        let released = false;
        return () => {
          if (released) return;
          released = true;
          count.current -= 1;
          if (count.current === 0) {
            undo.current?.();
            undo.current = null;
          }
        };
      },
    };
  }, [role, container]);

  return createElement(
    PortalContext.Provider,
    { value: scope },
    children,
    createElement("div", { ref: setContainer, "data-portal": role }),
  );
}

export function usePortalContainer() {
  return useContext(PortalContext)?.container;
}

/**
 * Makes the page behind inert while `active` is true. Call it from a modal overlay's popup with its
 * open state, not its mounted state: the lock lifts in the same commit that closes it, before Base UI
 * returns focus to the trigger on the page.
 */
export function useModalLock(active: boolean) {
  const scope = useContext(PortalContext);
  const lock = scope?.lock;
  const ready = !!scope?.container;
  useLayoutEffect(() => {
    if (!active || !lock || !ready) return;
    return lock();
  }, [active, lock, ready]);
}
