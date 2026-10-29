import type * as React from "react";
import { cn } from "cn";

// Helpers for the design system's components. Classes merge with the `cn` package, imported from its source.
// shortcut: the type-* conflict group is not registered with cn, so a caller's type-* role is appended
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
 * The design system's classes and the caller's, for a Base UI part whose className may be a function of its state
 * (data-checked, open, disabled ...). A function is composed, not passed through, so the design system's classes stay either way.
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
 * It returns React 19's cleanup, which runs each ref's own cleanup, or clears the ref when it has none.
 */
export function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]): React.RefCallback<T> {
  return (node) => {
    const cleanups = refs.map((ref) => {
      if (typeof ref === "function") {
        const cleanup = ref(node);
        return typeof cleanup === "function" ? cleanup : () => ref(null);
      }
      if (ref) {
        (ref as React.RefObject<T | null>).current = node;
        return () => {
          (ref as React.RefObject<T | null>).current = null;
        };
      }
      return undefined;
    });
    return () => {
      for (const cleanup of cleanups) cleanup?.();
    };
  };
}
