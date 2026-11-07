import { describe, expect, it } from "vitest";

import { capsForTarget, type UserActionCaps } from "@/components/admin/users/target-caps";
import { SystemRole } from "@/lib/types/user";

const caps: UserActionCaps = {
  canSuspend: true,
  canResetPassword: true,
  canDelete: true,
  canUnlock: true,
};

describe("capsForTarget", () => {
  it("offers deleting an admin with admins:delete alone, as the API requires", () => {
    const narrowed = capsForTarget(caps, SystemRole.ADMIN, {
      canWriteAdmins: false,
      canDeleteAdmins: true,
      isViewerSuperadmin: false,
    });

    expect(narrowed.canDelete).toBe(true);
    expect(narrowed.canSuspend).toBe(false);
  });

  it("refuses deleting an admin without admins:delete or users:delete", () => {
    const tier = { canWriteAdmins: true, canDeleteAdmins: false, isViewerSuperadmin: false };
    expect(capsForTarget(caps, SystemRole.ADMIN, tier).canDelete).toBe(false);

    const withKey = { ...tier, canDeleteAdmins: true };
    expect(capsForTarget({ ...caps, canDelete: false }, SystemRole.ADMIN, withKey).canDelete).toBe(
      false,
    );
  });

  it("keeps a superadmin out of reach of anyone but a superadmin", () => {
    const tier = { canWriteAdmins: true, canDeleteAdmins: true, isViewerSuperadmin: false };

    expect(capsForTarget(caps, SystemRole.SUPERADMIN, tier).canDelete).toBe(false);
    expect(
      capsForTarget(caps, SystemRole.SUPERADMIN, { ...tier, isViewerSuperadmin: true }).canDelete,
    ).toBe(true);
  });
});
