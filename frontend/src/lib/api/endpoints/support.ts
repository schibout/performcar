import api from "@/lib/api/api";
import { pruneParams } from "@/lib/api/endpoints/admin";
import type {
  AdminTicketDetail,
  AdminTicketListParams,
  AdminTicketListResponse,
  AdminTicketResponse,
  AdminTicketUpdatePayload,
  MessageCreatePayload,
  SupportMessageResponse,
  SupportTicketDetail,
  SupportTicketListParams,
  SupportTicketListResponse,
  SupportTicketResponse,
  TicketCreatePayload,
} from "@/lib/types/support";

export const userSupportApi = {
  createTicket: (payload: TicketCreatePayload): Promise<SupportTicketResponse> =>
    api.post<SupportTicketResponse, SupportTicketResponse>("/support/tickets", payload),

  listTickets: (params?: SupportTicketListParams): Promise<SupportTicketListResponse> =>
    api.get<SupportTicketListResponse, SupportTicketListResponse>("/support/tickets", {
      params: pruneParams(params),
    }),

  getTicket: (id: string): Promise<SupportTicketDetail> =>
    api.get<SupportTicketDetail, SupportTicketDetail>(`/support/tickets/${id}`),

  replyTicket: (id: string, payload: MessageCreatePayload): Promise<SupportMessageResponse> =>
    api.post<SupportMessageResponse, SupportMessageResponse>(
      `/support/tickets/${id}/messages`,
      payload,
    ),

  closeTicket: (id: string): Promise<SupportTicketResponse> =>
    api.post<SupportTicketResponse, SupportTicketResponse>(`/support/tickets/${id}/close`),
};

export const adminSupportApi = {
  listTickets: (params?: AdminTicketListParams): Promise<AdminTicketListResponse> =>
    api.get<AdminTicketListResponse, AdminTicketListResponse>("/admin/support/tickets", {
      params: pruneParams(params),
    }),

  getTicket: (id: string): Promise<AdminTicketDetail> =>
    api.get<AdminTicketDetail, AdminTicketDetail>(`/admin/support/tickets/${id}`),

  replyTicket: (id: string, payload: MessageCreatePayload): Promise<SupportMessageResponse> =>
    api.post<SupportMessageResponse, SupportMessageResponse>(
      `/admin/support/tickets/${id}/messages`,
      payload,
    ),

  updateTicket: (id: string, payload: AdminTicketUpdatePayload): Promise<AdminTicketResponse> =>
    api.patch<AdminTicketResponse, AdminTicketResponse>(`/admin/support/tickets/${id}`, payload),
};
