/** URL state shared by dashboard, reviews, sessions and progress. Repository names remain exact. */
export type ProjectScope = "all" | "unassigned" | `repo:${string}`;

export function parseProjectScope(value: unknown): ProjectScope {
  const input = Array.isArray(value) ? value[0] : value;
  if (input === "unassigned") return "unassigned";
  if (
    typeof input === "string" &&
    input.startsWith("repo:") &&
    input.length > 5 &&
    input.length <= 205 &&
    ![...input].some((character) => character.charCodeAt(0) < 32)
  )
    return input as ProjectScope;
  return "all";
}
export const projectScope = (repo: string | null | undefined): ProjectScope =>
  repo ? `repo:${repo}` : "unassigned";
export const projectMatches = (repo: string | null | undefined, scope: ProjectScope): boolean =>
  scope === "all" || projectScope(repo) === scope;
export const projectLabel = (scope: ProjectScope): string =>
  scope === "all" ? "All projects" : scope === "unassigned" ? "No project" : scope.slice(5);

/** Every project-aware link carries the same scope; unrelated query parameters and anchors survive. */
export function projectHref(path: string, scope: ProjectScope): string {
  const url = new URL(path, "http://session-coach.local");
  if (scope === "all") url.searchParams.delete("project");
  else url.searchParams.set("project", scope);
  return `${url.pathname}${url.search}${url.hash}`;
}
