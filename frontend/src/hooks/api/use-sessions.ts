import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { sessionsApi } from "@/lib/api/endpoints/sessions";
import type { SessionListParams } from "@/lib/types/session";

export const sessionKeys = {
  all: ["sessions"] as const,
  list: (params?: SessionListParams) => ["sessions", "list", params ?? {}] as const,
};

export const useSessions = (params?: SessionListParams) =>
  useQuery({
    queryKey: sessionKeys.list(params),
    queryFn: () => sessionsApi.list(params),
    placeholderData: keepPreviousData,
  });

// Success toasts come from the backend `message` via the axios response
// interceptor — no manual toast in either mutation.

export const useRevokeSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sessionsApi.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
};

export const useRevokeOtherSessions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sessionsApi.revokeOthers(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
};
