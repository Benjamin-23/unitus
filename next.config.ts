import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Log in with PayPal returns to 127.0.0.1 (PayPal won't accept "localhost"
  // as a Return URL), so the dev server must serve its dev assets there too.
  // Without this, pages on 127.0.0.1 don't become interactive in development.
  allowedDevOrigins: ["127.0.0.1"],
  cacheComponents: true,
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

export default nextConfig;
