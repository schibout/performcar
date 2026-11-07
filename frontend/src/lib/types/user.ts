import type { FilePublic } from "./file";
import type { Permission } from "./permissions";

export enum SystemRole {
  SUPERADMIN = "superadmin",
  ADMIN = "admin",
  USER = "user",
}

// Admin-tier = anyone who lives in the admin shell. Single source of truth for
// the "admin OR superadmin" checks scattered across routing/login/logout flows
// — forgetting SUPERADMIN in one of them causes double-redirect bugs.
export const isAdminTierRole = (role: SystemRole | undefined): boolean =>
  role === SystemRole.ADMIN || role === SystemRole.SUPERADMIN;

export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  role: SystemRole;
  // True only for the single root superadmin (the first one seeded). Drives the
  // root-only admin-tier actions (promote/demote a superadmin, transfer root).
  is_root_superadmin?: boolean;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  deactivated_at: string | null;
  deletion_scheduled_at: string | null;
  suspended_at: string | null;
  avatar_file?: FilePublic | null;
  // Dealership the account works for (quote generator perimeter).
  dealership_id?: string | null;
  // The keys the account can use, powering the per-permission UI gates. Omitted
  // entirely for superadmins, who hold every key by role.
  permissions?: Permission[];
}

export interface UserUpdateResponse {
  user: User;
  message: string;
}

// Fields a user may change on their own account via PATCH /users/me. Distinct
// from `User` because the avatar is attached by id (`avatar_file_id`), whereas
// the response embeds the resolved `avatar_file` object.
export interface UpdateMePayload {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  title?: string | null;
  avatar_file_id?: string | null;
}
