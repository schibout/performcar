"use client";

import { useEffect } from "react";

import { ErrorPage } from "@/components/feedback/ErrorPage";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return <ErrorPage error={error} reset={reset} />;
}
