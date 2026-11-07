import { z } from "zod";

import { FILE_CATEGORY } from "@/lib/types/file";

import type { TFunction } from "i18next";

// New-ticket form. Lengths are user-friendly minimums; the upper bounds the
// backend enforces (subject 200, body 10000) are kept off the schema and
// applied as input maxLength in the form so the user simply can't exceed them.
export const getCreateTicketSchema = (t: TFunction) =>
  z.object({
    subject: z.string().min(5, { message: t("validation:subjectMin", { count: 5 }) }),
    body: z.string().min(10, { message: t("validation:bodyMin", { count: 10 }) }),
    attachment_file_ids: z.array(z.string()).optional(),
  });

export type CreateTicketFormValues = z.infer<ReturnType<typeof getCreateTicketSchema>>;

// Reply form: any non-empty message is valid.
export const getReplySchema = (t: TFunction) =>
  z.object({
    body: z.string().min(1, { message: t("validation:messageRequired") }),
    attachment_file_ids: z.array(z.string()).optional(),
  });

export type ReplyFormValues = z.infer<ReturnType<typeof getReplySchema>>;

// --- Realtime frame validation ----------------------------------------------
// WebSocket frames are untrusted input, so we parse them with Zod instead of
// casting. The schema mirrors the backend `RealtimeEvent` (and `lib/types`),
// and `z.infer` stays structurally compatible with the `RealtimeEvent`
// interface — tsc flags any drift at the socket call site.

const fileCategorySchema = z.enum([
  FILE_CATEGORY.GENERAL,
  FILE_CATEGORY.USER_PROFILE_PHOTO,
  FILE_CATEGORY.SUPPORT_ATTACHMENT,
]);

const filePublicSchema = z.object({
  id: z.string(),
  url: z.string(),
  content_type: z.string(),
  size: z.number(),
  filename: z.string().nullable(),
  category: fileCategorySchema,
  created_at: z.string(),
});

const supportTicketUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
});

const supportMessageSchema = z.object({
  id: z.string(),
  sender_id: z.string().nullable(),
  sender_role: z.enum(["user", "admin"]),
  body: z.string(),
  read_at: z.string().nullable(),
  created_at: z.string(),
  attachments: z.array(z.object({ id: z.string(), file: filePublicSchema })),
});

const adminTicketListItemSchema = z.object({
  id: z.string(),
  subject: z.string(),
  status: z.enum(["open", "pending", "answered", "closed"]),
  priority: z.enum(["low", "normal", "high"]),
  last_message_at: z.string(),
  created_at: z.string(),
  closed_at: z.string().nullable(),
  unread_count: z.number(),
  assigned_admin_id: z.string().nullable(),
  assigned_admin: supportTicketUserSchema.nullable(),
  user: supportTicketUserSchema,
});

// `message` feeds the React Query cache, `ticket` is currently unread on the
// client — a malformed nested payload degrades to null via `.catch(null)` so a
// valid envelope (type + ticket_id) still drives cache invalidation. A
// malformed envelope fails the parse and the frame is dropped by the caller.
export const realtimeEventSchema = z.object({
  type: z.enum(["message_created", "ticket_created", "ticket_updated"]),
  ticket_id: z.string(),
  message: supportMessageSchema.nullable().catch(null),
  ticket: adminTicketListItemSchema.nullable().catch(null),
});
