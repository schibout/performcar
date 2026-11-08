import api from "@/lib/api/api";
import type {
  AdminActivityListParams,
  AdminActivityListResponse,
  AdminCreatePayload,
  AdminListParams,
  AdminListResponse,
  AdminMutationResponse,
  AdminPermissionsUpdatePayload,
  AdminStats,
  AdminUser,
  AdminUserListParams,
  AdminUserListResponse,
  AdminUserCreatePayload,
  AdminUserUpdatePayload,
  AdminUserUpdateResponse,
  PermissionCatalogResponse,
  RootTransferConfirmPayload,
  RootTransferRequestPayload,
} from "@/lib/types/admin";
import type { MessageResponse } from "@/lib/types/auth";
import type {
  SessionListParams,
  SessionListResponse,
  SessionsRevokedResponse,
} from "@/lib/types/session";

// Drop undefined / empty-string keys so axios doesn't serialize them onto the
// URL. Generic over the caller's param type so we don't have to widen admin
// request shapes to `Record<string, unknown>` just to satisfy the helper.
export const pruneParams = <T extends object>(params?: T): Partial<T> | undefined => {
  if (!params) return undefined;
  const result: Partial<T> = {};
  let hasEntry = false;
  for (const key of Object.keys(params) as (keyof T)[]) {
    const value = params[key];
    if (value === undefined || value === "") continue;
    result[key] = value;
    hasEntry = true;
  }
  return hasEntry ? result : undefined;
};

export const adminApi = {
  listUsers: (params?: AdminUserListParams): Promise<AdminUserListResponse> =>
    api.get<AdminUserListResponse, AdminUserListResponse>("/admin/users", {
      params: pruneParams(params),
    }),

  // Active, already verified `user` account; roles are set afterwards.
  createUser: (payload: AdminUserCreatePayload): Promise<AdminUserUpdateResponse> =>
    api.post<AdminUserUpdateResponse, AdminUserUpdateResponse>("/admin/users", payload),

  getUser: (id: string): Promise<AdminUser> => api.get<AdminUser, AdminUser>(`/admin/users/${id}`),

  updateUser: (id: string, payload: AdminUserUpdatePayload): Promise<AdminUserUpdateResponse> =>
    api.patch<AdminUserUpdateResponse, AdminUserUpdateResponse>(`/admin/users/${id}`, payload),

  suspendUser: (id: string): Promise<MessageResponse> =>
    api.post<MessageResponse, MessageResponse>(`/admin/users/${id}/suspend`),

  unsuspendUser: (id: string): Promise<MessageResponse> =>
    api.post<MessageResponse, MessageResponse>(`/admin/users/${id}/unsuspend`),

  unlockUser: (id: string): Promise<MessageResponse> =>
    api.post<MessageResponse, MessageResponse>(`/admin/users/${id}/unlock`),

  deleteUser: (id: string): Promise<MessageResponse> =>
    api.delete<MessageResponse, MessageResponse>(`/admin/users/${id}`),

  changePassword: (id: string, lang: string): Promise<MessageResponse> =>
    api.post<MessageResponse, MessageResponse>(`/admin/users/${id}/change-password`, undefined, {
      params: { lang },
    }),

  listUserActivities: (
    userId: string,
    params?: Pick<AdminActivityListParams, "skip" | "limit">,
  ): Promise<AdminActivityListResponse> =>
    api.get<AdminActivityListResponse, AdminActivityListResponse>(
      `/admin/users/${userId}/activities`,
      { params: pruneParams(params) },
    ),

  listUserSessions: (userId: string, params?: SessionListParams): Promise<SessionListResponse> =>
    api.get<SessionListResponse, SessionListResponse>(`/admin/users/${userId}/sessions`, {
      params: pruneParams(params),
    }),

  revokeUserSessions: (userId: string): Promise<SessionsRevokedResponse> =>
    api.delete<SessionsRevokedResponse, SessionsRevokedResponse>(`/admin/users/${userId}/sessions`),

  // Filters + pagination ride the POST body (the audit log query grew enough
  // filters that a body is cleaner than a long query string).
  listActivities: (params?: AdminActivityListParams): Promise<AdminActivityListResponse> =>
    api.post<AdminActivityListResponse, AdminActivityListResponse>(
      "/admin/activities/search",
      pruneParams(params) ?? {},
    ),

  getStats: (): Promise<AdminStats> => api.get<AdminStats, AdminStats>("/admin/stats"),

  // --- Admin / RBAC management (superadmin only) ---------------------------

  listAdmins: (params?: AdminListParams): Promise<AdminListResponse> =>
    api.get<AdminListResponse, AdminListResponse>("/admin/admins", {
      params: pruneParams(params),
    }),

  getPermissionCatalog: (): Promise<PermissionCatalogResponse> =>
    api.get<PermissionCatalogResponse, PermissionCatalogResponse>("/admin/admins/permissions"),

  // Create a brand-new admin account (replaces promote-an-existing-user).
  createAdmin: (payload: AdminCreatePayload): Promise<AdminMutationResponse> =>
    api.post<AdminMutationResponse, AdminMutationResponse>("/admin/admins", payload),

  setAdminPermissions: (
    id: string,
    payload: AdminPermissionsUpdatePayload,
  ): Promise<AdminMutationResponse> =>
    api.patch<AdminMutationResponse, AdminMutationResponse>(
      `/admin/admins/${id}/permissions`,
      payload,
    ),

  // Hard-delete an admin account.
  deleteAdmin: (id: string): Promise<MessageResponse> =>
    api.delete<MessageResponse, MessageResponse>(`/admin/admins/${id}`),

  // Admin -> superadmin (root only).
  promoteSuperadmin: (id: string): Promise<AdminMutationResponse> =>
    api.post<AdminMutationResponse, AdminMutationResponse>(`/admin/admins/${id}/promote`),

  // Superadmin -> admin (root only).
  demoteSuperadmin: (id: string): Promise<AdminMutationResponse> =>
    api.post<AdminMutationResponse, AdminMutationResponse>(`/admin/admins/${id}/demote`),

  // Email-OTP root transfer (root only): request emails an OTP to the root.
  transferRoot: (payload: RootTransferRequestPayload): Promise<MessageResponse> =>
    api.post<MessageResponse, MessageResponse>("/admin/admins/transfer-root", payload),

  confirmTransferRoot: (payload: RootTransferConfirmPayload): Promise<AdminMutationResponse> =>
    api.post<AdminMutationResponse, AdminMutationResponse>(
      "/admin/admins/transfer-root/confirm",
      payload,
    ),
};
