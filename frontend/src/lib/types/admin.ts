import { SystemRole, type User } from "./user";

import type { Permission } from "./permissions";

export { SystemRole };

export type ActivityType =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "execute"
  | "login"
  | "logout"
  | "export"
  | "invite";

export type ResourceType =
  | "user"
  | "auth"
  | "file"
  | "support_ticket"
  | "system_settings"
  | "role"
  | "permission_set"
  | "announcement";

export type ActivityStatus = "success" | "failure";

// Strict JSON-value shape for audit-log `details`. The backend (FastAPI)
// stores it as `dict[str, JsonValue]`; keeping the client type symmetric means
// we never have to resort to `unknown` or `any` when inspecting rows.
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ActivityDetails = Record<string, JsonValue>;

// Admin list/detail rows. The backend returns the same shape as the existing
// /users/me User plus admin-only fields; reusing the User type keeps the
// client aligned with auth-store consumers.
export type AdminUser = User;

export interface AdminStats {
  users_total: number;
  users_active: number;
  users_verified: number;
  users_admins: number;
  activities_total: number;
  activities_today: number;
}

export interface AdminUserListResponse {
  data: AdminUser[];
  total: number;
  skip: number;
  limit: number;
}

export interface AdminUserListParams {
  skip?: number;
  limit?: number;
  search?: string;
  role?: SystemRole;
  is_active?: boolean;
  is_verified?: boolean;
}

// Email is intentionally absent — admins cannot rewrite a user's identity.
// The backend enforces this with ``extra=forbid`` on the matching Pydantic
// schema, so a stray ``email`` key returns 422 instead of being silently
// dropped.
export interface AdminUserUpdatePayload {
  first_name?: string | null;
  last_name?: string | null;
  title?: string | null;
  is_active?: boolean;
  is_verified?: boolean;
  avatar_file_id?: string | null;
  dealership_id?: string | null;
}

export interface AdminUserUpdateResponse {
  user: AdminUser;
  message: string;
}

export interface ActivityActor {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export interface AdminActivity {
  id: string;
  user_id: string | null;
  actor_ref: string | null;
  user_deleted_at: string | null;
  user: ActivityActor | null;
  activity_type: ActivityType;
  resource_type: ResourceType;
  resource_id: string | null;
  details: ActivityDetails;
  status: ActivityStatus;
  status_code: number | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AdminActivityListResponse {
  data: AdminActivity[];
  total: number;
  skip: number;
  limit: number;
}

export interface AdminActivityListParams {
  skip?: number;
  limit?: number;
  user_id?: string;
  user_search?: string;
  activity_type?: ActivityType;
  resource_type?: ResourceType;
  status?: ActivityStatus;
  status_code?: number;
  date_from?: string;
  date_to?: string;
}

// --- Admin / RBAC management ------------------------------------------------

// An admin-tier account with the permissions it holds. Superadmins are reported
// by the backend as holding every permission for display.
export interface AdminListItem {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: SystemRole;
  is_active: boolean;
  is_root_superadmin: boolean;
  permissions: Permission[];
  created_at: string;
}

export interface AdminListResponse {
  data: AdminListItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface AdminListParams {
  skip?: number;
  limit?: number;
  role?: SystemRole;
}

// Create a brand-new admin account (replaces the old promote-an-existing-user
// flow). Mirrors the backend ``AdminCreate`` schema.
export interface AdminCreatePayload {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  password: string;
  permissions: Permission[];
}

export interface AdminPermissionsUpdatePayload {
  permissions: Permission[];
}

// Email-OTP root-superadmin transfer (root only).
export interface RootTransferRequestPayload {
  user_id: string;
}

export interface RootTransferConfirmPayload {
  code: string;
}

export interface AdminMutationResponse {
  admin: AdminListItem;
  message: string;
}

export interface PermissionCatalogResponse {
  permissions: Permission[];
}
