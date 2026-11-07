import { SystemRole } from "@/lib/types/user";

export interface UserActionCaps {
  canSuspend: boolean;
  canResetPassword: boolean;
  canDelete: boolean;
  canUnlock: boolean;
}

// What the viewer holds on the admin tier, which the API checks on top of the
// users:* key whenever the target is an admin or a superadmin.
export interface AdminTierCaps {
  canWriteAdmins: boolean;
  canDeleteAdmins: boolean;
  // Only a superadmin may act on a superadmin account at all.
  isViewerSuperadmin: boolean;
}

// Deny by default: a caller that forgets to pass the admin-tier caps never
// offers an action the API would refuse on an admin account.
export const NO_ADMIN_TIER_CAPS: AdminTierCaps = {
  canWriteAdmins: false,
  canDeleteAdmins: false,
  isViewerSuperadmin: false,
};

/**
 * Whether the viewer may change an account of this role (edit form, avatar,
 * sessions, suspend, unlock, password reset): users:write for a plain user, and
 * additionally admins:write for an admin-tier target.
 */
export const canMutateTarget = (role: SystemRole, tier: AdminTierCaps): boolean => {
  if (role === SystemRole.USER) return true;
  if (role === SystemRole.SUPERADMIN && !tier.isViewerSuperadmin) return false;
  return tier.canWriteAdmins;
};

/**
 * The row/danger-zone caps narrowed to one target. For an admin-tier target every
 * mutation needs admins:write, except delete, which needs admins:delete instead.
 */
export const capsForTarget = (
  caps: UserActionCaps,
  role: SystemRole,
  tier: AdminTierCaps,
): UserActionCaps => {
  if (role === SystemRole.USER) return caps;
  const mutable = canMutateTarget(role, tier);
  const reachable = role !== SystemRole.SUPERADMIN || tier.isViewerSuperadmin;
  return {
    canSuspend: caps.canSuspend && mutable,
    canResetPassword: caps.canResetPassword && mutable,
    canUnlock: caps.canUnlock && mutable,
    canDelete: caps.canDelete && reachable && tier.canDeleteAdmins,
  };
};
