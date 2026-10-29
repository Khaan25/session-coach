import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

// The public pages only; the app behind sign-in is disallowed in robots.ts.
const paths = [
  "/",
  "/how-it-works",
  "/pricing",
  "/privacy",
  "/terms",
  "/support",
  "/delete-account",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.map((path) => ({ url: new URL(path, siteUrl).href }));
}
