"use client";

import { useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";

/**
 * The public header's frame: a plain row at the top of the page that floats in as a narrower, bordered pill once the
 * page scrolls. motion only reports the scroll; the change itself is a CSS transition on the drawer curve, which
 * reduced motion turns off.
 */
export function SiteNavPill({ children }: { children: React.ReactNode }) {
  const { scrollY } = useScroll();
  const [floating, setFloating] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setFloating(y > 24));

  return (
    <header data-site-nav className="sticky top-0 z-(--z-above) px-2 sm:px-4">
      <nav
        aria-label="Main"
        data-floating={floating || undefined}
        className="mx-auto flex h-18 w-full max-w-(--container) items-center justify-between gap-6 rounded-frame border border-transparent px-(--gutter-sm) transition-nav duration-(--dur-250) ease-drawer data-floating:mt-3 data-floating:h-14 data-floating:max-w-3xl data-floating:border-border data-floating:bg-page/85 data-floating:backdrop-blur-md motion-reduce:transition-none sm:h-20 sm:px-(--gutter) sm:data-floating:h-14 sm:data-floating:px-4"
      >
        {children}
      </nav>
    </header>
  );
}
