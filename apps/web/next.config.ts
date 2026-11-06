import { withContentCollections } from "@content-collections/next";
import type { NextConfig } from "next";

import { productionEnvProblems } from "./src/lib/production-env";

// A production deploy fails here rather than ship localhost in sitemap.xml or a support inbox no one reads.
const problems = productionEnvProblems(process.env);
if (problems.length > 0)
  throw new Error(`Production build is missing settings:\n- ${problems.join("\n- ")}`);

const sharedPreview =
  process.env.NODE_ENV !== "production" &&
  process.env.DESIGN_PREVIEW === "1" &&
  process.env.DESIGN_SHARE_ORIGIN
    ? new URL(process.env.DESIGN_SHARE_ORIGIN)
    : null;
const nextConfig: NextConfig = {
  allowedDevOrigins: sharedPreview ? [sharedPreview.hostname] : undefined,
  async rewrites() {
    if (!sharedPreview) return [];
    const fixtures = `http://127.0.0.1:${Number(process.env.DESIGN_PREVIEW_PORT || 54329)}`;
    return [
      { source: "/__design/preview", destination: fixtures + "/preview" },
      { source: "/__design/fixtures/:path*", destination: fixtures + "/:path*" },
    ];
  },
  cacheComponents: true,
  experimental: { turbopackFileSystemCacheForDev: process.env.DESIGN_PREVIEW !== "1" },
  // The visual preview should not cover account controls with the development indicator.
  devIndicators: process.env.DESIGN_PREVIEW === "1" ? false : undefined,
  poweredByHeader: false,
  // Baseline headers on every response. No script CSP yet: the theme script is inline and would need a nonce.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// withContentCollections builds content/ into .content-collections before Next compiles.
export default withContentCollections(nextConfig);
