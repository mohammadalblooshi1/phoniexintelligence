import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ship the overview PDF with the server code so emails can attach it.
  outputFileTracingIncludes: { "/**": ["./assets/phoniex-overview.pdf"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
