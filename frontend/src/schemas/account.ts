import { z } from "zod";

// Runtime shape of an account-channel realtime frame, mirrored with the backend
// `AccountEvent`. Validated on the socket so malformed frames are dropped rather
// than acted on.
export const accountEventSchema = z.object({
  type: z.enum(["permissions_updated", "sessions_revoked"]),
});

export type AccountEvent = z.infer<typeof accountEventSchema>;
