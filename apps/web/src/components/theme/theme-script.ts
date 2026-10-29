// The no-flash theme script and the names it shares with ThemeProvider. A plain module, not
// "use client", because the server root layout inlines the script string.

export const STORAGE_KEY = "session-coach-theme";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

/*
 * Runs in <head> before first paint. Mirrors `readStoredTheme` and the `resolvedTheme` rule in
 * ThemeProvider; keep them in step. Only the storage read sits in try/catch: storage throws where
 * it is blocked, and the system theme must still apply then.
 */
export const themeScript = `(function(){var t;try{t=localStorage.getItem("${STORAGE_KEY}")}catch(e){}if(t!=="light"&&t!=="dark")t=matchMedia("${DARK_QUERY}").matches?"dark":"light";document.documentElement.classList.add(t)})()`;
