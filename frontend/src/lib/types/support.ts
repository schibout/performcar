import type { FilePublic } from "@/lib/types/file";

// --- Enumerations (string unions mirroring the backend StrEnums) -----------

export type TicketStatus = "open" | "pending" | "answered" | "closed";
export type TicketPriority = "low" | "normal" | "high";
export type SenderRole = "user" | "admin";
export type RealtimeEventType = "message_created" | "ticket_created" | "ticket_updated";

// Iterable lists for building selects/filters without re-typing the unions.
export const TICKET_STATUSES: readonly TicketStatus[] = ["open", "pending", "answered", "closed"];
export const TICKET_PRIORITIES: readonly TicketPriority[] = ["low", "normal", "high"];

// --- Message-level shapes ---------------------------------------------------

export interface SupportMessageAttachment {
  id: string;
  file: FilePublic;
}

export interface SupportMessage {
  id: string;
  sender_id: string | null;
  sender_role: SenderRole;
  body: string;
  read_at: string | null;
  created_at: string;
  attachments: SupportMessageAttachment[];
}

// --- Ticket-level shapes (user side) ---------------------------------------

export interface SupportTicketListItem {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  last_message_at: string;
  created_at: string;
  closed_at: string | null;
  unread_count: number;
}

export interface SupportTicketListResponse {
  data: SupportTicketListItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface SupportTicketDetail {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  last_message_at: string;
  created_at: string;
  closed_at: string | null;
  messages: SupportMessage[];
}

// --- Ticket-level shapes (admin side) --------------------------------------

export interface SupportTicketUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export interface AdminTicketListItem extends SupportTicketListItem {
  assigned_admin_id: string | null;
  assigned_admin: SupportTicketUser | null;
  user: SupportTicketUser;
}

export interface AdminTicketListResponse {
  data: AdminTicketListItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface AdminTicketDetail extends SupportTicketDetail {
  assigned_admin_id: string | null;
  assigned_admin: SupportTicketUser | null;
  user: SupportTicketUser;
}

// --- Query params -----------------------------------------------------------

export interface SupportTicketListParams {
  skip?: number;
  limit?: number;
  status?: TicketStatus;
  search?: string;
}

export interface AdminTicketListParams {
  skip?: number;
  limit?: number;
  search?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_admin_id?: string;
}

// --- Request payloads -------------------------------------------------------

export interface TicketCreatePayload {
  subject: string;
  body: string;
  attachment_file_ids?: string[];
}

export interface MessageCreatePayload {
  body: string;
  attachment_file_ids?: string[];
}

export interface AdminTicketUpdatePayload {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_admin_id?: string | null;
}

// --- Response wrappers ------------------------------------------------------

export interface SupportTicketResponse {
  ticket: SupportTicketDetail;
  message: string;
}

export interface SupportMessageResponse {
  data: SupportMessage;
  message: string;
}

export interface AdminTicketResponse {
  ticket: AdminTicketDetail;
  message: string;
}

// --- Realtime ---------------------------------------------------------------

export interface RealtimeEvent {
  type: RealtimeEventType;
  ticket_id: string;
  message: SupportMessage | null;
  ticket: AdminTicketListItem | null;
}
