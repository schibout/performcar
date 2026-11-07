import api from "@/lib/api/api";
import type { MessageResponse } from "@/lib/types/auth";
import type {
  AssignmentsUpdatePayload,
  PermissionSet,
  PermissionSetCreatePayload,
  PermissionSetListResponse,
  PermissionSetUpdatePayload,
  RbacPermissionCatalog,
  Role,
  RoleCreatePayload,
  RoleListResponse,
  RoleUpdatePayload,
  UserAccess,
} from "@/lib/types/rbac";

export const rbacApi = {
  getPermissionCatalog: (): Promise<RbacPermissionCatalog> =>
    api.get<RbacPermissionCatalog, RbacPermissionCatalog>("/admin/rbac/permissions"),

  listPermissionSets: (): Promise<PermissionSetListResponse> =>
    api.get<PermissionSetListResponse, PermissionSetListResponse>("/admin/rbac/permission-sets"),

  createPermissionSet: (payload: PermissionSetCreatePayload): Promise<PermissionSet> =>
    api.post<PermissionSet, PermissionSet>("/admin/rbac/permission-sets", payload),

  updatePermissionSet: (id: string, payload: PermissionSetUpdatePayload): Promise<PermissionSet> =>
    api.patch<PermissionSet, PermissionSet>(`/admin/rbac/permission-sets/${id}`, payload),

  deletePermissionSet: (id: string): Promise<MessageResponse> =>
    api.delete<MessageResponse, MessageResponse>(`/admin/rbac/permission-sets/${id}`),

  listRoles: (): Promise<RoleListResponse> =>
    api.get<RoleListResponse, RoleListResponse>("/admin/rbac/roles"),

  createRole: (payload: RoleCreatePayload): Promise<Role> =>
    api.post<Role, Role>("/admin/rbac/roles", payload),

  updateRole: (id: string, payload: RoleUpdatePayload): Promise<Role> =>
    api.patch<Role, Role>(`/admin/rbac/roles/${id}`, payload),

  deleteRole: (id: string): Promise<MessageResponse> =>
    api.delete<MessageResponse, MessageResponse>(`/admin/rbac/roles/${id}`),

  getUserAccess: (userId: string): Promise<UserAccess> =>
    api.get<UserAccess, UserAccess>(`/admin/users/${userId}/access`),

  setUserRoles: (userId: string, payload: AssignmentsUpdatePayload): Promise<UserAccess> =>
    api.put<UserAccess, UserAccess>(`/admin/users/${userId}/roles`, payload),

  setUserPermissionSets: (userId: string, payload: AssignmentsUpdatePayload): Promise<UserAccess> =>
    api.put<UserAccess, UserAccess>(`/admin/users/${userId}/permission-sets`, payload),
};
