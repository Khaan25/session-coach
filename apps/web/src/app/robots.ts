import type { MetadataRoute } from "next";

// NEXT_PUBLIC_SITE_URL is the deployed origin; localhost is only the dev fallback until it is set.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The signed-in app, the design-system gallery and sign-in: nothing a search result should land on.
      disallow: [
        "/dashboard",
        "/s/",
        "/review",
        "/progress",
        "/settings",
        "/setup",
        "/design-system",
        "/login",
        "/sign-up",
        "/forgot-password",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
