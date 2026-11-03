"use client";

import { bind, play } from "cuelume";
import { useEffect } from "react";

const CUED =
  "[data-cuelume-tap],[data-cuelume-select],[data-cuelume-toggle],[data-cuelume-open],[data-cuelume-close]";

/** Plays `navigate` for a plain left click on a same-origin link that carries no cue of its own. */
function navigate(event: MouseEvent) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return;
  const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!(link instanceof HTMLAnchorElement) || link.closest(CUED)) return;
  if (link.target === "_blank" || link.origin !== location.origin) return;
  play("navigate");
}

// Delegates every `data-cuelume-*` attribute in the document to cuelume's synthesized sounds; bind returns its cleanup.
// The primitives in components/ui carry the attributes, so a new control gets its sound by using them. Links get
// `navigate` here instead, so no Link in the app has to opt in.
export function UiSounds() {
  useEffect(() => {
    const unbind = bind();
    document.addEventListener("click", navigate, { capture: true });
    return () => {
      unbind();
      document.removeEventListener("click", navigate, { capture: true });
    };
  }, []);
  return null;
}
