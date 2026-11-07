import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCanReadOwnSupport } from "@/hooks/use-permissions";
import { adminSupportApi, userSupportApi } from "@/lib/api/endpoints/support";
import type {
  AdminTicketListParams,
  AdminTicketUpdatePayload,
  MessageCreatePayload,
  SupportTicketListParams,
  TicketCreatePayload,
} from "@/lib/types/support";

type QueryClient = ReturnType<typeof useQueryClient>;

// User-owned ticket surfaces. Distinct top-level segments keep
// prefix-invalidation from fanning out into the admin queue caches.
export const supportKeys = {
  all: ["support"] as const,
  myListPrefix: ["support", "myList"] as const,
  myList: (params?: SupportTicketListParams) => ["support", "myList", params ?? {}] as const,
  detail: (id: string) => ["support", "detail", id] as const,
};

export const adminSupportKeys = {
  all: ["adminSupport"] as const,
  listPrefix: ["adminSupport", "list"] as const,
  list: (params?: AdminTicketListParams) => ["adminSupport", "list", params ?? {}] as const,
  detail: (id: string) => ["adminSupport", "detail", id] as const,
};

// --- User hooks -------------------------------------------------------------

// The caller's own tickets wait for `self.support:read`: without it (or before
// the user is loaded) no request is sent.
export const useMyTickets = (params?: SupportTicketListParams) => {
  const enabled = useCanReadOwnSupport();
  return useQuery({
    queryKey: supportKeys.myList(params),
    queryFn: () => userSupportApi.listTickets(params),
    placeholderData: keepPreviousData,
    enabled,
  });
};

export const useMyTicket = (id: string | undefined) => {
  const canRead = useCanReadOwnSupport();
  return useQuery({
    queryKey: id ? supportKeys.detail(id) : ["support", "detail", "invalid"],
    queryFn: () => {
      if (!id) throw new Error("Ticket ID is required");
      return userSupportApi.getTicket(id);
    },
    enabled: Boolean(id) && canRead,
  });
};

export const useCreateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TicketCreatePayload) => userSupportApi.createTicket(payload),
    onSuccess: (response) => {
      queryClient.setQueryData(supportKeys.detail(response.ticket.id), response.ticket);
      queryClient.invalidateQueries({ queryKey: supportKeys.myListPrefix });
    },
  });
};

export const useReplyTicket = (ticketId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MessageCreatePayload) => userSupportApi.replyTicket(ticketId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportKeys.detail(ticketId) });
      queryClient.invalidateQueries({ queryKey: supportKeys.myListPrefix });
    },
  });
};

export const useCloseTicket = (ticketId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => userSupportApi.closeTicket(ticketId),
    onSuccess: (response) => {
      queryClient.setQueryData(supportKeys.detail(ticketId), response.ticket);
      queryClient.invalidateQueries({ queryKey: supportKeys.myListPrefix });
    },
  });
};

// --- Admin hooks ------------------------------------------------------------

const invalidateAdminSurfaces = (queryClient: QueryClient, ticketId: string) => {
  queryClient.invalidateQueries({ queryKey: adminSupportKeys.detail(ticketId) });
  queryClient.invalidateQueries({ queryKey: adminSupportKeys.listPrefix });
};

export const useAdminTickets = (params?: AdminTicketListParams) =>
  useQuery({
    queryKey: adminSupportKeys.list(params),
    queryFn: () => adminSupportApi.listTickets(params),
    placeholderData: keepPreviousData,
  });

export const useAdminTicket = (id: string | undefined) =>
  useQuery({
    queryKey: id ? adminSupportKeys.detail(id) : ["adminSupport", "detail", "invalid"],
    queryFn: () => {
      if (!id) throw new Error("Ticket ID is required");
      return adminSupportApi.getTicket(id);
    },
    enabled: Boolean(id),
  });

export const useAdminReplyTicket = (ticketId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MessageCreatePayload) => adminSupportApi.replyTicket(ticketId, payload),
    onSuccess: () => {
      invalidateAdminSurfaces(queryClient, ticketId);
    },
  });
};

export const useUpdateAdminTicket = (ticketId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminTicketUpdatePayload) =>
      adminSupportApi.updateTicket(ticketId, payload),
    // The success notification is driven by the backend `message` via the axios
    // response interceptor — no manual toast here.
    onSuccess: (response) => {
      queryClient.setQueryData(adminSupportKeys.detail(ticketId), response.ticket);
      queryClient.invalidateQueries({ queryKey: adminSupportKeys.listPrefix });
    },
  });
};
