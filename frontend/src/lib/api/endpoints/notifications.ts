import api from "@/lib/api/api";
import { pruneParams } from "@/lib/api/endpoints/admin";
import type {
  NotificationListParams,
  NotificationListResponse,
  NotificationReadResponse,
  NotificationsMarkAllReadResponse,
  UnreadCountResponse,
} from "@/lib/types/notification";

export const notificationsApi = {
  list: (params?: NotificationListParams): Promise<NotificationListResponse> =>
    api.get<NotificationListResponse, NotificationListResponse>("/notifications", {
      params: pruneParams(params),
    }),

  unreadCount: (): Promise<UnreadCountResponse> =>
    api.get<UnreadCountResponse, UnreadCountResponse>("/notifications/unread-count"),

  markRead: (id: string): Promise<NotificationReadResponse> =>
    api.post<NotificationReadResponse, NotificationReadResponse>(`/notifications/${id}/read`),

  markAllRead: (): Promise<NotificationsMarkAllReadResponse> =>
    api.post<NotificationsMarkAllReadResponse, NotificationsMarkAllReadResponse>(
      "/notifications/read-all",
    ),
};
