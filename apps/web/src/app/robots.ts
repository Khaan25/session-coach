import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The signed-in app and the design-system gallery. Sign-in pages stay crawlable so crawlers can read their
      // noindex; a disallowed page can still be indexed from links.
      disallow: [
        "/dashboard",
        "/s/",
        "/review",
        "/progress",
        "/settings",
        "/setup",
        "/design-system",
      ],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).href,
  };
}
