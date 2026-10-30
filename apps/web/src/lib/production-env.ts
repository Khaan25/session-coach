// Checked by next.config.ts, so a production deploy fails at build instead of shipping placeholders. Previews and
// local builds fall back to the placeholders in lib/site.ts and keep working.

/** The placeholder inbox lib/site.ts falls back to. A reserved domain, so it reaches no one. */
export const EXAMPLE_SUPPORT_EMAIL = "support@example.com";

/**
 * What a production build is missing from the public site settings.
 *
 * @param env - The build's environment (`process.env`).
 * @returns One message per problem; empty outside Vercel production or when everything is set.
 */
export function productionEnvProblems(env: Record<string, string | undefined>): string[] {
  if (env.VERCEL_ENV !== "production") return [];
  const problems: string[] = [];
  if (!env.NEXT_PUBLIC_SITE_URL?.trim())
    problems.push(
      "NEXT_PUBLIC_SITE_URL is unset, so robots.txt and sitemap.xml would name localhost.",
    );
  const email = env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim().toLowerCase();
  if (!email || email.endsWith("@example.com"))
    problems.push(
      "NEXT_PUBLIC_SUPPORT_EMAIL is unset or an example.com address, so /support and /delete-account would show an inbox no one reads.",
    );
  return problems;
}
