import { withContentCollections } from "@content-collections/next";
import type { NextConfig } from "next";

import { productionEnvProblems } from "./src/lib/production-env";

// A production deploy fails here rather than ship localhost in sitemap.xml or a support inbox no one reads.
const problems = productionEnvProblems(process.env);
if (problems.length > 0)
  throw new Error(`Production build is missing settings:\n- ${problems.join("\n- ")}`);

const nextConfig: NextConfig = {
  cacheComponents: true,
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
