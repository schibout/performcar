import { z } from "zod";

import type { JsonValue } from "@/lib/types/admin";

// --- Realtime frame validation ----------------------------------------------
// WebSocket frames are untrusted input, so we parse them with Zod instead of
// casting. The schema mirrors the backend `NotificationRealtimeEvent` (and
// `lib/types/notification`) — tsc flags any drift at the socket call site.

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const notificationItemSchema = z.object({
  id: z.string(),
  type: z.enum([
    "support_ticket_replied",
    "support_ticket_status_changed",
    "admin_permissions_changed",
    "admin_announcement",
  ]),
  data: z.record(z.string(), jsonValueSchema),
  read_at: z.string().nullable(),
  created_at: z.string(),
});

export const notificationRealtimeEventSchema = z.object({
  type: z.literal("notification_created"),
  notification: notificationItemSchema,
});
