"use client";

import { bind } from "cuelume";
import { useEffect } from "react";

// Delegates every `data-cuelume-*` attribute in the document to cuelume's synthesized sounds; bind returns its cleanup.
// The primitives in components/ui carry the attributes, so a new control gets its sound by using them.
export function UiSounds() {
  useEffect(() => bind(), []);
  return null;
}
