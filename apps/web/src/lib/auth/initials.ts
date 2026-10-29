/**
 * Up to two initials for a learner's avatar: first and last word of the display name, else the start of the email,
 * so the header menu and the sidebar menu show the same letters for the same person.
 *
 * @param name - The display name, if the learner set one.
 * @param email - The account email, used when there is no name.
 * @returns One or two capital letters, or "?" when both are empty.
 */
export function initialsOf(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  const words = (name || email?.split("@")[0] || "").split(/[\s._-]+/).filter(Boolean);
  const letters = (words[0]?.[0] ?? "") + (words.length > 1 ? (words.at(-1)?.[0] ?? "") : "");
  return letters.toUpperCase() || "?";
}
