"use client";

import { createContext, use, useEffect, useMemo, useSyncExternalStore } from "react";

import { DARK_QUERY, STORAGE_KEY } from "./theme-script";

/*
 * Ported from the vennsol design-system zip (`theme-provider.tsx`), itself adapted from
 * https://ui.shadcn.com/docs/dark-mode. Changes for Next.js:
 *
 * - The zip read `localStorage` and `matchMedia` in `useState` initialisers. Those run on the
 *   server here, so both are read through `useSyncExternalStore`, with the server snapshot as
 *   the default theme. The class itself is set before paint by `themeScript` in the root layout,
 *   so there is no flash while React hydrates.
 * - No unmount cleanup: the provider wraps the whole app, so the class never has to leave.
 */

/** Theme names a user can pick. `system` defers to the OS. */
const THEMES = ["light", "dark", "system"] as const;

/** A theme a user can choose, including deferring to the OS. */
export type Theme = (typeof THEMES)[number];

/** What `system` collapses to: the only two values that reach the DOM. */
export type ResolvedTheme = Exclude<Theme, "system">;

const DEFAULT_THEME: Theme = "system";
type ThemeProviderState = {
  /** The user's choice, which may be `system`. */
  theme: Theme;
  /** The choice with `system` resolved; matches the class on `<html>`. */
  resolvedTheme: ResolvedTheme;
  /** Persists the choice and re-themes the document. */
  setTheme: (theme: Theme) => void;
};

/* Null rather than a stub, so `useTheme` can tell "outside a provider" from "inside one". */
const ThemeProviderContext = createContext<ThemeProviderState | null>(null);

const isTheme = (value: unknown): value is Theme => THEMES.includes(value as Theme);

// Where storage is blocked, the choice lives here for this page view.
let memoryTheme: Theme | null = null;

const readStoredTheme = (): Theme | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : memoryTheme;
  } catch {
    return memoryTheme;
  }
};

/* `storage` only fires for other tabs, so writes in this tab notify subscribers themselves. */
const storageListeners = new Set<() => void>();

const writeStoredTheme = (theme: Theme) => {
  memoryTheme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage denied: the choice lasts for this page view only.
  }
  storageListeners.forEach((listener) => listener());
};

const subscribeStorage = (onChange: () => void) => {
  storageListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    storageListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
};

const subscribeSystem = (onChange: () => void) => {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

const getSystemPrefersDark = () => window.matchMedia(DARK_QUERY).matches;

const noopSubscribe = () => () => {};

/**
 * Owns the app theme: the user's choice, its persistence, and the class on `<html>` that the
 * tokens and every `dark:` utility resolve against. `<html>` because dialogs and menus portal
 * outside the app subtree, and only `<html>` is an ancestor of both.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const storedTheme = useSyncExternalStore(subscribeStorage, readStoredTheme, () => null);
  const systemPrefersDark = useSyncExternalStore(
    subscribeSystem,
    getSystemPrefersDark,
    () => false,
  );
  // The hydration render uses the server snapshots (light); themeScript already set the right class.
  const isHydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const theme = storedTheme ?? DEFAULT_THEME;

  // `system` is a rule, not a value, so it is resolved every render instead of stored.
  const resolvedTheme: ResolvedTheme =
    theme === "system" ? (systemPrefersDark ? "dark" : "light") : theme;

  useEffect(() => {
    if (!isHydrated) return;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
  }, [isHydrated, resolvedTheme]);

  const value = useMemo<ThemeProviderState>(
    () => ({ theme, resolvedTheme, setTheme: writeStoredTheme }),
    [theme, resolvedTheme],
  );

  return <ThemeProviderContext value={value}>{children}</ThemeProviderContext>;
}

/** Reads the theme. Throws outside a `ThemeProvider`, so misuse fails loudly. */
export const useTheme = () => {
  const context = use(ThemeProviderContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }
  return context;
};
