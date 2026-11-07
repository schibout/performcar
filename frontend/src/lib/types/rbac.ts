import type { Permission } from "./permissions";
import type { SystemRole } from "./user";

// Mirrors `app/schemas/rbac.py`.
export const RbacAudience = {
  User: "user",
  Admin: "admin",
} as const;
export type RbacAudience = (typeof RbacAudience)[keyof typeof RbacAudience];

export const RbacSourceKind = {
  Role: "role",
  PermissionSet: "permission_set",
  Direct: "direct",
  Superadmin: "superadmin",
} as const;
export type RbacSourceKind = (typeof RbacSourceKind)[keyof typeof RbacSourceKind];

export interface RbacPermissionInfo {
  key: Permission;
  resource: string;
  action: string;
  audience: RbacAudience;
}

export interface RbacPermissionCatalog {
  data: RbacPermissionInfo[];
}

export interface PermissionSet {
  id: string;
  key: string;
  name: string;
  description: string | null;
  audience: RbacAudience;
  is_system: boolean;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
}

export interface PermissionSetListResponse {
  data: PermissionSet[];
}

export interface PermissionSetCreatePayload {
  key: string;
  name: string;
  description?: string | null;
  audience: RbacAudience;
  permissions: Permission[];
}

// Key and audience are fixed at creation.
export interface PermissionSetUpdatePayload {
  name?: string;
  description?: string | null;
  permissions?: Permission[];
}

export interface RolePermissionSet {
  id: string;
  key: string;
  name: string;
}

export interface Role {
  id: string;
  key: string;
  name: string;
  description: string | null;
  audience: RbacAudience;
  is_system: boolean;
  permission_sets: RolePermissionSet[];
  created_at: string;
  updated_at: string;
}

export interface RoleListResponse {
  data: Role[];
}

export interface RoleCreatePayload {
  key: string;
  name: string;
  description?: string | null;
  audience: RbacAudience;
  permission_set_ids: string[];
}

export interface RoleUpdatePayload {
  name?: string;
  description?: string | null;
  permission_set_ids?: string[];
}

export interface AssignmentItem {
  id: string;
  expires_at: string | null;
}

export interface AssignmentsUpdatePayload {
  assignments: AssignmentItem[];
}

export interface Assignment {
  id: string;
  key: string;
  name: string;
  audience: RbacAudience;
  expires_at: string | null;
  expired: boolean;
}

export interface PermissionSource {
  kind: RbacSourceKind;
  key: string;
}

export interface EffectivePermission {
  permission: Permission;
  sources: PermissionSource[];
}

export interface UserAccess {
  account_role: SystemRole;
  roles: Assignment[];
  permission_sets: Assignment[];
  direct_permissions: Permission[];
  effective: EffectivePermission[];
}

// Whether any of these assignments still gives the account admin access.
export const hasActiveAdminAssignment = (items: Assignment[], now: number): boolean =>
  items.some(
    (item) =>
      item.audience === RbacAudience.Admin &&
      !item.expired &&
      (item.expires_at === null || new Date(item.expires_at).getTime() > now),
  );
