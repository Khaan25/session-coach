import type { MetadataRoute } from "next";

// NEXT_PUBLIC_SITE_URL is the deployed origin; localhost is only the dev fallback until it is set.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// The public pages only; the app behind sign-in is disallowed in robots.ts.
const paths = ["/", "/how-it-works", "/pricing", "/privacy", "/terms", "/support"];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.map((path) => ({ url: new URL(path, siteUrl).href }));
}
