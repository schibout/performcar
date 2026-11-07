import { useMemo } from "react";

import { Permission } from "@/lib/types/permissions";
import { SystemRole } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";

export interface PermissionsApi {
  /** False until the auth store holds the user: do not render a forbidden state yet. */
  isReady: boolean;
  /** True when the current user is a superadmin (implicitly holds everything). */
  isSuperadmin: boolean;
  /** The permission keys the account can use (empty for superadmins). */
  permissions: Permission[];
  /** Whether the current user may exercise a given permission. */
  has: (permission: Permission) => boolean;
}

/**
 * Read the current user's RBAC capabilities from the auth store.
 *
 * Superadmins short-circuit to `true` for every check via their role, so the
 * backend never has to ship them a permission list. Every other account, regular
 * users included, is gated by the effective permissions delivered on `/users/me`:
 * the union of its roles, permission sets and direct grants.
 */
export function usePermissions(): PermissionsApi {
  const user = useAuthStore((state) => state.user);

  return useMemo<PermissionsApi>(() => {
    const isSuperadmin = user?.role === SystemRole.SUPERADMIN;
    const permissions = user?.permissions ?? [];
    const granted = new Set(permissions);
    return {
      isReady: Boolean(user),
      isSuperadmin,
      permissions,
      has: (permission: Permission) => isSuperadmin || granted.has(permission),
    };
  }, [user]);
}

export const useIsSuperadmin = (): boolean => usePermissions().isSuperadmin;

/** True only for the root superadmin (governs the superadmin-tier actions). */
export const useIsRootSuperadmin = (): boolean => {
  const user = useAuthStore((state) => state.user);
  return user?.is_root_superadmin === true;
};

export const useCanReadUsers = (): boolean => usePermissions().has(Permission.UsersRead);
export const useCanWriteUsers = (): boolean => usePermissions().has(Permission.UsersWrite);
export const useCanDeleteUsers = (): boolean => usePermissions().has(Permission.UsersDelete);
export const useCanSuspendUsers = (): boolean => usePermissions().has(Permission.UsersSuspend);
export const useCanResetUserPassword = (): boolean =>
  usePermissions().has(Permission.UsersPasswordReset);
export const useCanUnlockUsers = (): boolean => usePermissions().has(Permission.UsersUnlock);
export const useCanManageUserSessions = (): boolean =>
  usePermissions().has(Permission.UsersSessions);

export const useCanReadFiles = (): boolean => usePermissions().has(Permission.FilesRead);
export const useCanDeleteFiles = (): boolean => usePermissions().has(Permission.FilesDelete);

export const useCanReadSupport = (): boolean => usePermissions().has(Permission.SupportRead);
export const useCanWriteSupport = (): boolean => usePermissions().has(Permission.SupportWrite);
export const useCanUpdateSupport = (): boolean => usePermissions().has(Permission.SupportUpdate);

export const useCanReadActivities = (): boolean => usePermissions().has(Permission.ActivitiesRead);
export const useCanReadStats = (): boolean => usePermissions().has(Permission.StatsRead);

export const useCanReadBroadcasts = (): boolean => usePermissions().has(Permission.BroadcastRead);
export const useCanWriteBroadcasts = (): boolean => usePermissions().has(Permission.BroadcastWrite);

export const useCanReadSystemSettings = (): boolean =>
  usePermissions().has(Permission.SystemSettingsRead);
export const useCanWriteSystemSettings = (): boolean =>
  usePermissions().has(Permission.SystemSettingsWrite);

export const useCanReadRoles = (): boolean => usePermissions().has(Permission.RolesRead);
export const useCanWriteRoles = (): boolean => usePermissions().has(Permission.RolesWrite);

export const useCanReadPermissionSets = (): boolean =>
  usePermissions().has(Permission.PermissionSetsRead);
export const useCanWritePermissionSets = (): boolean =>
  usePermissions().has(Permission.PermissionSetsWrite);

export const useCanReadAdmins = (): boolean => usePermissions().has(Permission.AdminsRead);
export const useCanWriteAdmins = (): boolean => usePermissions().has(Permission.AdminsWrite);
export const useCanDeleteAdmins = (): boolean => usePermissions().has(Permission.AdminsDelete);

// Self-service keys: what an account may do with its own data. Admins and
// superadmins pass them too (the default role carries them; superadmins hold all).
export const useCanUpdateOwnProfile = (): boolean =>
  usePermissions().has(Permission.SelfProfileUpdate);
export const useCanUploadOwnFiles = (): boolean => usePermissions().has(Permission.SelfFilesUpload);
export const useCanReadOwnNotifications = (): boolean =>
  usePermissions().has(Permission.SelfNotificationsRead);
export const useCanReadOwnSupport = (): boolean => usePermissions().has(Permission.SelfSupportRead);
export const useCanCreateOwnTicket = (): boolean =>
  usePermissions().has(Permission.SelfSupportCreate);
export const useCanReplyOwnTicket = (): boolean =>
  usePermissions().has(Permission.SelfSupportReply);
export const useCanCloseOwnTicket = (): boolean =>
  usePermissions().has(Permission.SelfSupportClose);
