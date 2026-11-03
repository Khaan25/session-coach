// Tags Claude Code injects before a prompt. The tag and everything inside it is noise, never part of the title.
const DROPPED_TAG =
  /^<(system-reminder|local-command-caveat|local-command-stdout|command-name|command-message|command-args)(?:\s[^>]*)?>/;
// A paste is the prompt itself, so only its tags go and the text inside stays.
const PASTED_OPEN = /^<pasted_content(?:\s[^>]*)?>/;
const PASTED_CLOSE = "</pasted_content>";
const WHITESPACE = /\s+/g;

/**
 * Turns a prompt's text into a title by removing injected tags from the start and collapsing whitespace.
 *
 * - A leading `system-reminder`, `local-command-*` or `command-*` tag is removed together with its contents. If it is
 *   never closed, all the text after it goes too.
 * - A leading `pasted_content` tag is removed on its own, with its closing tag if there is one. The text inside stays,
 *   closed or not, because a title saved from a long prompt was cut at 80 characters and has no closing tag.
 * - Any other tag, and any tag after the first words, is part of what the learner typed and stays.
 *
 * Cleaning a result a second time changes nothing.
 *
 * @param text - A first prompt, or a title that was saved from one.
 * @returns The cleaned text, or an empty string when only injected tags were there.
 */
export function cleanPromptTitle(text: string): string {
  let rest = text.trimStart();
  for (;;) {
    const dropped = DROPPED_TAG.exec(rest);
    if (dropped) {
      const close = `</${dropped[1]}>`;
      const end = rest.indexOf(close, dropped[0].length);
      rest = end === -1 ? "" : rest.slice(end + close.length).trimStart();
      continue;
    }
    const pasted = PASTED_OPEN.exec(rest);
    if (pasted) {
      const inner = rest.slice(pasted[0].length);
      const end = inner.indexOf(PASTED_CLOSE);
      rest = (
        end === -1 ? inner : `${inner.slice(0, end)} ${inner.slice(end + PASTED_CLOSE.length)}`
      ).trimStart();
      continue;
    }
    return rest.replace(WHITESPACE, " ").trim();
  }
}

/**
 * What a session is called everywhere it's listed: its title when it has one, else where the work happened
 * ("repo on branch"), so two untitled sessions in different repos still read apart in the sidebar. The title is
 * cleaned here as well as when it is saved, because rows saved before the cleaning existed still hold the raw tags.
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
    cleanPromptTitle(session.title ?? "") ||
    [session.repo, session.branch].filter(Boolean).join(" on ") ||
    "Untitled session"
  );
}
