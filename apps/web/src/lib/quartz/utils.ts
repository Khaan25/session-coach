import type * as React from "react";
import { cn } from "cn";

// From design.how/r/quartz/utils.json (checked 2026-10-29). Quartz merges classes with clsx and an
// extended tailwind-merge; Session Coach uses the `cn` package, imported from its source by each caller.
// shortcut: Quartz's type-* conflict group is not registered, so a caller's type-* role is appended
// rather than replacing the component's; register it with cn's engine if a call site needs that.

type ClassValue = Parameters<typeof cn>[number];

/**
 * The height of a one-line control, one formula for every control of that size: the size's token, or one line plus
 * 8, 12 or 24px of padding if the text grows past it. Button, Select and SegmentedControl take it from here; a
 * Field input never wraps, so its fixed token height is the same number.
 */
export const controlHeight = {
  xs: "h-[max(var(--control-xs),1lh)]",
  sm: "h-[max(var(--control-sm),calc(1lh+var(--space-2)))]",
  default: "h-[max(var(--control),calc(1lh+var(--space-3)))]",
  lg: "h-[max(var(--control-lg),calc(1lh+var(--space-6)))]",
} as const;

/**
 * Quartz's classes and the caller's, for a Base UI part whose className may be a function of its state
 * (data-checked, open, disabled ...). A function is composed, not passed through, so Quartz's classes stay either way.
 * Pass several base parts as an array: mergeClass([variants({size}), 'gap-2'], className).
 */
export function mergeClass<State>(
  base: ClassValue,
  className: string | ((state: State) => string | undefined) | undefined,
): string | ((state: State) => string) {
  return typeof className === "function"
    ? (state: State) => cn(base, className(state))
    : cn(base, className);
}

/**
 * One callback ref that sets every ref it is given, for a component that keeps its own ref and forwards the caller's.
 * Wrap it in useMemo or useCallback when the element should not be detached and attached again on every render.
 */
export function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]): React.RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.RefObject<T | null>).current = node;
    }
  };
}

/**
 * A component's words: its defaults with the caller's on top. A key the caller left undefined keeps the
 * default, so `labels={{send: maybeTranslated}}` never blanks a button when a translation is missing.
 */
export function withDefaults<T extends object, G extends object = Partial<T>>(
  defaults: T,
  given?: G,
): T & Omit<G, keyof T> {
  const out = { ...defaults } as Record<string, unknown>;
  if (given)
    for (const [key, value] of Object.entries(given)) if (value !== undefined) out[key] = value;
  return out as T & Omit<G, keyof T>;
}
