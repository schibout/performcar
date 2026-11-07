import type { JsonValue } from "@/lib/types/admin";

// --- Enumerations (string unions mirroring the backend StrEnums) -----------

// Each value doubles as the i18n key under `notifications:types.<type>`.
export type NotificationType =
  | "support_ticket_replied"
  | "support_ticket_status_changed"
  | "admin_permissions_changed"
  | "admin_announcement";

export type NotificationEventType = "notification_created";

// --- Core shapes ------------------------------------------------------------

export interface NotificationItem {
  id: string;
  type: NotificationType;
  data: Record<string, JsonValue>;
  read_at: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  data: NotificationItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

// --- Query params -----------------------------------------------------------

export interface NotificationListParams {
  skip?: number;
  limit?: number;
  unread_only?: boolean;
}

// --- Response wrappers ------------------------------------------------------

export interface NotificationReadResponse {
  data: NotificationItem;
  message: string;
}

export interface NotificationsMarkAllReadResponse {
  updated: number;
  message: string;
}

// --- Realtime ---------------------------------------------------------------

export interface NotificationRealtimeEvent {
  type: NotificationEventType;
  notification: NotificationItem;
}
