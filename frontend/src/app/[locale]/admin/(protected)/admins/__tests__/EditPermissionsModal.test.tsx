import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import type { AdminListItem } from "@/lib/types/admin";
import { Permission } from "@/lib/types/permissions";
import { RbacAudience, type Assignment, type UserAccess } from "@/lib/types/rbac";
import { SystemRole } from "@/lib/types/user";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/test-utils";

import { EditPermissionsModal } from "../EditPermissionsModal";

const admin = {
  id: "a1",
  email: "a1@test.com",
  first_name: null,
  last_name: null,
  role: SystemRole.ADMIN,
  is_active: true,
  is_root_superadmin: false,
  permissions: [],
  created_at: "2026-01-01T00:00:00Z",
} as AdminListItem;

const adminRole: Assignment = {
  id: "role-agent",
  key: "agent",
  name: "Agent",
  audience: RbacAudience.Admin,
  expires_at: null,
  expired: false,
};

const accessWith = (roles: Assignment[]): UserAccess => ({
  account_role: SystemRole.ADMIN,
  roles,
  permission_sets: [],
  direct_permissions: [],
  effective: [],
});

const mockAccess = (roles: Assignment[]) => {
  server.use(
    http.get("*/api/v1/admin/users/a1/access", () => HttpResponse.json(accessWith(roles))),
  );
};

const renderModal = (target: AdminListItem = admin) => {
  renderWithProviders(
    <EditPermissionsModal
      admin={target}
      catalog={[Permission.UsersRead]}
      open
      onClose={() => undefined}
    />,
  );
};

const WARNING = "assign-warning-demote";

beforeEach(() => {
  mockAccess([]);
});

describe("EditPermissionsModal demotion warning", () => {
  it("warns when no direct grant and no other admin access remain", async () => {
    renderModal();

    expect(await screen.findByTestId(WARNING)).toHaveTextContent(
      "admin:rbac.access.assign.demoteWarning",
    );
  });

  it("stays quiet while a direct grant remains", () => {
    renderModal({ ...admin, permissions: [Permission.UsersRead] });

    expect(screen.queryByTestId(WARNING)).not.toBeInTheDocument();
  });

  it("drops the warning once an admin role is known to keep the account in", async () => {
    mockAccess([adminRole]);
    renderModal();

    await waitFor(() => {
      expect(screen.queryByTestId(WARNING)).not.toBeInTheDocument();
    });
  });

  it("still warns over a lapsed admin role", async () => {
    mockAccess([{ ...adminRole, expired: true }]);
    renderModal();

    expect(await screen.findByTestId(WARNING)).toBeInTheDocument();
  });

  it("warns when the account's access cannot be read", async () => {
    server.use(
      http.get("*/api/v1/admin/users/a1/access", () => new HttpResponse(null, { status: 500 })),
    );
    renderModal();

    expect(await screen.findByTestId(WARNING)).toBeInTheDocument();
  });
});
