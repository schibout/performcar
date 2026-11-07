import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Validated env. Throws at startup (or build) if anything required is missing
// or malformed. Always import from here instead of touching process.env.
export const env = createEnv({
  server: {
    SENTRY_DSN: z.url().optional(),
    SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_API_URL: z.url().default("http://localhost:8000"),
    NEXT_PUBLIC_API_PREFIX: z.string().default("/api/v1"),
    // Optional explicit WebSocket origin. When unset it's derived from
    // NEXT_PUBLIC_API_URL (http -> ws, https -> wss).
    NEXT_PUBLIC_WS_URL: z.url().optional(),
    NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
    NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
    NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
  },
  runtimeEnv: {
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE,
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_API_PREFIX: process.env.NEXT_PUBLIC_API_PREFIX,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  },
  // "" (unset in some hosting providers) should behave as undefined so
  // optional fields and defaults work as expected.
  emptyStringAsUndefined: true,
  // Useful in Docker builds where envs are injected at runtime, not build.
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
});
