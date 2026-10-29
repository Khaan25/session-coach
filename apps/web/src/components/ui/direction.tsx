"use client";

// Base UI computes some layout in JavaScript (submenu side, arrow-key direction in menus, sliders and
// tabs) and reads the direction from this provider, not the DOM. The design system's DirectionScope
// (@/lib/ui/direction) wraps the same provider and also scopes portals to the direction.
export { DirectionProvider, useDirection } from "@base-ui/react/direction-provider";
