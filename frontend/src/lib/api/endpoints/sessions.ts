import api from "@/lib/api/api";
import { pruneParams } from "@/lib/api/endpoints/admin";
import type { MessageResponse } from "@/lib/types/auth";
import type {
  SessionListParams,
  SessionListResponse,
  SessionsRevokedResponse,
} from "@/lib/types/session";

export const sessionsApi = {
  list: (params?: SessionListParams): Promise<SessionListResponse> =>
    api.get<SessionListResponse, SessionListResponse>("/users/me/sessions", {
      params: pruneParams(params),
    }),

  revoke: (id: string): Promise<MessageResponse> =>
    api.delete<MessageResponse, MessageResponse>(`/users/me/sessions/${id}`),

  revokeOthers: (): Promise<SessionsRevokedResponse> =>
    api.delete<SessionsRevokedResponse, SessionsRevokedResponse>("/users/me/sessions"),
};
