import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { UserDangerZone } from "@/components/admin/users/UserDangerZone";
import type { AdminUser } from "@/lib/types/admin";
import { SystemRole } from "@/lib/types/user";

const baseUser: AdminUser = {
  id: "u1",
  email: "u@test.com",
  first_name: "U",
  last_name: "Ser",
  title: null,
  role: SystemRole.USER,
  is_active: true,
  is_verified: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  deactivated_at: null,
  deletion_scheduled_at: null,
  suspended_at: null,
};

const allCaps = { canResetPassword: true, canSuspend: true, canDelete: true, canUnlock: true };

const renderZone = (overrides: Partial<React.ComponentProps<typeof UserDangerZone>> = {}) => {
  const props = {
    user: baseUser,
    isSelf: false,
    disabled: false,
    caps: allCaps,
    onAction: vi.fn(),
    ...overrides,
  };
  render(<UserDangerZone {...props} />);
  return props;
};

describe("UserDangerZone", () => {
  it("shows 'suspend' for active users and 'unsuspend' for suspended ones", () => {
    const { rerender } = render(
      <UserDangerZone
        user={baseUser}
        isSelf={false}
        disabled={false}
        caps={allCaps}
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /admin:userDetail\.suspend/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /admin:userDetail\.unsuspend/ }),
    ).not.toBeInTheDocument();

    rerender(
      <UserDangerZone
        user={{ ...baseUser, is_active: false, suspended_at: "2026-04-20T00:00:00Z" }}
        isSelf={false}
        disabled={false}
        caps={allCaps}
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /admin:userDetail\.unsuspend/ })).toBeInTheDocument();
  });

  it("disables destructive buttons for the admin's own account", () => {
    renderZone({ isSelf: true });
    expect(screen.getByRole("button", { name: /admin:userDetail\.suspend/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /admin:userDetail\.delete/ })).toBeDisabled();
    // Change-password stays enabled — an admin may want to rotate their own secrets.
    expect(screen.getByRole("button", { name: /admin:userDetail\.changePassword/ })).toBeEnabled();
  });

  it("invokes onAction with the correct kind when buttons are clicked", () => {
    const props = renderZone();
    fireEvent.click(screen.getByRole("button", { name: /admin:userDetail\.changePassword/ }));
    fireEvent.click(screen.getByRole("button", { name: /admin:userDetail\.suspend/ }));
    fireEvent.click(screen.getByRole("button", { name: /admin:userDetail\.delete/ }));
    expect(props.onAction).toHaveBeenCalledWith("change-password");
    expect(props.onAction).toHaveBeenCalledWith("suspend");
    expect(props.onAction).toHaveBeenCalledWith("delete");
  });

  it("offers unlock only with the unlock permission", () => {
    const props = renderZone();
    fireEvent.click(screen.getByRole("button", { name: /admin:userDetail\.unlock/ }));
    expect(props.onAction).toHaveBeenCalledWith("unlock");
  });

  it("hides unlock without the unlock permission", () => {
    renderZone({ caps: { ...allCaps, canUnlock: false } });
    expect(
      screen.queryByRole("button", { name: /admin:userDetail\.unlock/ }),
    ).not.toBeInTheDocument();
  });

  it("disables every button when the disabled flag is set", () => {
    renderZone({ disabled: true });
    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
  });

  describe("on an admin account", () => {
    const adminTarget = { ...baseUser, role: SystemRole.ADMIN };
    const tier = { canWriteAdmins: true, canDeleteAdmins: true, isViewerSuperadmin: false };

    it("hides every action without admins:write", () => {
      renderZone({ user: adminTarget });
      expect(screen.queryByTestId("admin-user-danger-zone")).not.toBeInTheDocument();
    });

    it("hides delete without admins:delete but keeps the writes", () => {
      renderZone({ user: adminTarget, adminTier: { ...tier, canDeleteAdmins: false } });
      expect(screen.getByRole("button", { name: /admin:userDetail\.suspend/ })).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /admin:userDetail\.delete/ }),
      ).not.toBeInTheDocument();
    });

    it("offers everything with admins:write and admins:delete", () => {
      renderZone({ user: adminTarget, adminTier: tier });
      expect(screen.getByRole("button", { name: /admin:userDetail\.delete/ })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /admin:userDetail\.changePassword/ }),
      ).toBeInTheDocument();
    });
  });
});
