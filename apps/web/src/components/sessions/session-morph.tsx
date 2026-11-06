import { ViewTransition } from "react";

/** The transition type a link to /s/[id] carries, so only opening a session morphs its row. */
export const OPEN_SESSION = "open-session";

/**
 * A session row (sidebar or dashboard list) and /s/[id]'s title share one name, so opening the session morphs the row
 * into the title. Only navigations tagged OPEN_SESSION animate: without the type, a row on one page and the same
 * session's row on the next (sidebar and dashboard list) would fly between them. A name may be mounted once at a time,
 * so a caller wraps only one copy per page.
 */
export function SessionMorph({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <ViewTransition
      name={`session-${id}`}
      share={{ [OPEN_SESSION]: "morph", default: "none" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
