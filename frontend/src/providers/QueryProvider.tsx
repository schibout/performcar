"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryDefaults = {
  queries: {
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    refetchOnMount: true,
  },
  mutations: {
    retry: false,
  },
};

// Module-level singleton so that remounts of the provider (e.g., when the
// root [locale] layout re-renders after a URL locale switch) don't throw
// away the query cache and force every live useQuery to refetch.
// `useState(() => new QueryClient())` would recreate the client on every
// remount, which is the Next.js App Router gotcha we're avoiding here.
let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    // Server: always make a fresh client so requests don't share cache.
    return new QueryClient({ defaultOptions: queryDefaults });
  }
  browserQueryClient ??= new QueryClient({ defaultOptions: queryDefaults });
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
