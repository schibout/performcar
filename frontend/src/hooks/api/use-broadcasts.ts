import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { broadcastsApi } from "@/lib/api/endpoints/broadcasts";
import type { BroadcastCreate, BroadcastListParams } from "@/lib/types/announcement";

export const broadcastKeys = {
  all: ["broadcasts"] as const,
  list: (params?: BroadcastListParams) => ["broadcasts", "list", params ?? {}] as const,
  templates: ["broadcasts", "templates"] as const,
  activeAnnouncement: ["announcements", "active"] as const,
};

export const useBroadcasts = (params?: BroadcastListParams) =>
  useQuery({
    queryKey: broadcastKeys.list(params),
    queryFn: () => broadcastsApi.list(params),
    placeholderData: keepPreviousData,
  });

export const useBroadcastTemplates = () =>
  useQuery({
    queryKey: broadcastKeys.templates,
    queryFn: () => broadcastsApi.templates(),
    staleTime: 1000 * 60 * 60, // catalog is static — cache for an hour
  });

export const useActiveAnnouncement = (enabled = true) =>
  useQuery({
    queryKey: broadcastKeys.activeAnnouncement,
    queryFn: () => broadcastsApi.active(),
    enabled,
  });

// Success toast is driven by the backend `message` via the axios interceptor.
export const useSendBroadcast = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BroadcastCreate) => broadcastsApi.send(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: broadcastKeys.all });
      // Distinct prefix from `all` — refresh the banner so a show_banner send
      // appears immediately instead of waiting for the WS event / staleTime.
      queryClient.invalidateQueries({ queryKey: broadcastKeys.activeAnnouncement });
    },
  });
};
