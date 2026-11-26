import { withContentCollections } from "@content-collections/next";
import type { NextConfig } from "next";

import { productionEnvProblems } from "./src/lib/production-env";

// A production deploy fails here rather than ship localhost in sitemap.xml or a support inbox no one reads.
const problems = productionEnvProblems(process.env);
if (problems.length > 0) {
  throw new Error(`Production build is missing settings:\n- ${problems.join("\n- ")}`);
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  poweredByHeader: false,
  // Vercel bills one transformation per source x width x quality. Every image is a local WebP, so keep the variants few.
  images: {
    formats: ["image/webp"],
    deviceSizes: [640, 1200, 1600],
    imageSizes: [128, 256, 800],
    qualities: [75],
    minimumCacheTTL: 31_536_000,
  },
  // Baseline headers on every response. No script CSP yet: the theme script is inline and would need a nonce.
  headers() {
    return Promise.resolve([
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
    ]);
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
