"use client";

// Base UI computes some layout in JavaScript (submenu side, arrow-key direction in menus, sliders and
// tabs) and reads the direction from this provider, not the DOM. Components that only need to read the
// direction from the DOM use useDomDirection (@/lib/ui/direction).
export { DirectionProvider, useDirection } from "@base-ui/react/direction-provider";
