/**
 * What a session is called everywhere it's listed: the agent's ai-title when the log had one, else where the work
 * happened ("repo on branch"), so two untitled sessions in different repos still read apart in the sidebar.
 *
 * @param session - The session's title, repo and branch, any of which may be missing.
 * @returns A non-empty display name.
 */
export function sessionName(session: {
  title?: string | null;
  repo?: string | null;
  branch?: string | null;
}): string {
  return (
    session.title ||
    [session.repo, session.branch].filter(Boolean).join(" on ") ||
    "Untitled session"
  );
}
