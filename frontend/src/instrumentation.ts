import * as Sentry from "@sentry/nextjs";

import { env } from "@/env";

export function register(): void {
  if (!env.SENTRY_DSN) return;

  const sampleRate = env.SENTRY_TRACES_SAMPLE_RATE;
  const environment = process.env.NODE_ENV;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment,
      tracesSampleRate: sampleRate,
      debug: false,
    });
  } else if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment,
      tracesSampleRate: sampleRate,
      debug: false,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
