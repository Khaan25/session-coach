import { EXAMPLE_SUPPORT_EMAIL } from "@/lib/production-env";

// Inlined at build time, so the pages that print them stay static. The fallbacks keep local and preview builds
// working; a production build fails without the real values (lib/production-env.ts, checked in next.config.ts).

/** The deployed origin, for robots.txt and sitemap.xml. */
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** The inbox /support and /delete-account show. */
export const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || EXAMPLE_SUPPORT_EMAIL;
