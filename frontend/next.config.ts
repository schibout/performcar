import "./src/env";

import { withSentryConfig } from "@sentry/nextjs";

import type { NextConfig } from "next";

// Static security headers applied to every response. The Content-Security-Policy
// is deliberately NOT here: it carries a per-request nonce and is therefore built
// dynamically in src/proxy.ts (see buildContentSecurityPolicy).
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // No Next.js badge in development: the app carries the PERFORM'CAR brand only.
  devIndicators: false,
  // Next 16 blocks cross-origin fetches to dev resources (HMR, source maps)
  // unless the host is explicitly allowed. Playwright's baseURL is
  // 127.0.0.1:3000, so without this entry the HMR websocket fails and
  // downstream hydration can stall on the loading.tsx fallback.
  allowedDevOrigins: ["127.0.0.1"],
  // Remote hosts next/image may optimise. Cloudinary serves uploaded support
  // attachments and avatars; mirror this in the CSP img-src above.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_API_PREFIX: process.env.NEXT_PUBLIC_API_PREFIX,
  },
  headers() {
    return Promise.resolve([{ source: "/:path*", headers: securityHeaders }]);
  },
  rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const apiPrefix = process.env.NEXT_PUBLIC_API_PREFIX || "/api/v1";

    return [
      {
        // Proxy all requests starting with apiPrefix to the actual backend
        source: `${apiPrefix}/:path*`,
        destination: `${apiUrl}${apiPrefix}/:path*`,
      },
    ];
  },
};

// Sentry wraps next.config to upload source maps and instrument the build.
// Source map upload only runs when SENTRY_AUTH_TOKEN is set; safe to omit
// in local dev or when no Sentry project exists yet.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  tunnelRoute: "/monitoring",
  webpack: { treeshake: { removeDebugLogging: true } },
});
