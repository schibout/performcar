import type { SystemRole } from "@/lib/types/admin";

// "all" is the UI sentinel for "no filter applied". Deliberately not "any"
// so it doesn't visually shadow the TypeScript `any` keyword.
//
// Kept in its own module (not alongside the component) because the
// `react-refresh/only-export-components` rule forbids mixing non-component
// exports with component exports in client files.

export const USERS_STATUS_FILTERS = ["all", "active", "inactive"] as const;
export type UsersStatusFilter = (typeof USERS_STATUS_FILTERS)[number];

export const USERS_VERIFIED_FILTERS = ["all", "yes", "no"] as const;
export type UsersVerifiedFilter = (typeof USERS_VERIFIED_FILTERS)[number];

export const USERS_ROLE_FILTERS = ["all", "superadmin", "admin", "user"] as const;
export type UsersRoleFilter = "all" | SystemRole;

export const isUsersStatusFilter = (value: string): value is UsersStatusFilter =>
  (USERS_STATUS_FILTERS as readonly string[]).includes(value);

export const isUsersVerifiedFilter = (value: string): value is UsersVerifiedFilter =>
  (USERS_VERIFIED_FILTERS as readonly string[]).includes(value);

export const isUsersRoleFilter = (value: string): value is UsersRoleFilter =>
  (USERS_ROLE_FILTERS as readonly string[]).includes(value);
