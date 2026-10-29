"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

// The design system's own components read the reading direction from the DOM with useDomDirection, so a
// component under a plain dir="rtl" mirrors with no provider. Base UI's own direction-aware parts read
// DirectionProvider (components/ui/direction.tsx) instead.

export type Direction = "ltr" | "rtl";

type DirectionTarget = RefObject<Element | null> | Element | null | undefined;

const resolve = (target: DirectionTarget) =>
  (target && "current" in target ? target.current : target) ?? null;

/**
 * An element's computed reading direction ('ltr' until it mounts), or the document's when there is no
 * element. Read after layout, then again only when a dir attribute changes somewhere in the document,
 * never on every render.
 */
export function useDomDirection(target: DirectionTarget): Direction {
  const [dir, setDir] = useState<Direction>("ltr");
  useLayoutEffect(() => {
    const doc =
      resolve(target)?.ownerDocument ?? (typeof document === "undefined" ? null : document);
    if (!doc) return;
    const read = () => {
      const el = resolve(target) ?? doc.documentElement;
      setDir(getComputedStyle(el).direction === "rtl" ? "rtl" : "ltr");
    };
    read();
    const watch = new MutationObserver(read);
    watch.observe(doc.documentElement, {
      attributes: true,
      attributeFilter: ["dir"],
      subtree: true,
    });
    return () => watch.disconnect();
  }, [target]);
  return dir;
}
