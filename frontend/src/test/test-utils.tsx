import React from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MotionConfig } from "motion/react";

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

export function renderWithProviders(ui: React.ReactElement) {
  const testQueryClient = createTestQueryClient();
  return {
    ...render(
      <QueryClientProvider client={testQueryClient}>
        <MotionConfig transition={{ duration: 0 }}>{ui}</MotionConfig>
      </QueryClientProvider>,
    ),
    testQueryClient,
  };
}

export const createWrapper = (client?: QueryClient) => {
  // Accept a caller-owned client so a test can assert cache side effects
  // (setQueryData / invalidation) after a hook runs. Defaults to a fresh,
  // isolated client when none is passed.
  const testQueryClient = client ?? createTestQueryClient();
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>
      <MotionConfig transition={{ duration: 0 }}>{children}</MotionConfig>
    </QueryClientProvider>
  );
};
