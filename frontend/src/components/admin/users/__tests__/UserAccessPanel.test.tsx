import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { UserAccessPanel } from "@/components/admin/users/UserAccessPanel";
import type { AdminUser } from "@/lib/types/admin";
import { Permission } from "@/lib/types/permissions";
import { RbacAudience, RbacSourceKind, type UserAccess } from "@/lib/types/rbac";
import { SystemRole } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/test-utils";

const baseUser: AdminUser = {
  id: "u1",
  email: "u1@test.com",
  first_name: "Ann",
  last_name: "User",
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

const memberRole = {
  id: "role-member",
  key: "member",
  name: "Member",
  audience: RbacAudience.User,
  expires_at: null,
  expired: false,
};

const access: UserAccess = {
  account_role: SystemRole.USER,
  roles: [memberRole],
  permission_sets: [],
  direct_permissions: [],
  effective: [
    {
      permission: Permission.SelfProfileUpdate,
      sources: [{ kind: RbacSourceKind.Role, key: "member" }],
    },
    {
      permission: Permission.SelfSupportCreate,
      sources: [
        { kind: RbacSourceKind.Role, key: "member" },
        { kind: RbacSourceKind.PermissionSet, key: "support_self" },
      ],
    },
  ],
};

const roleOptions = [
  { id: "role-member", key: "member", name: "Member", audience: RbacAudience.User },
  {
    id: "role-premium",
    key: "premium",
    name: "Premium",
    audience: RbacAudience.User,
  },
  {
    id: "role-agent",
    key: "agent",
    name: "Support agent",
    audience: RbacAudience.Admin,
  },
].map(({ id, key, name, audience }) => ({
  id,
  key,
  name,
  audience,
  is_system: false,
  description: null,
  permission_sets: [],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}));

const viewer = (role: SystemRole, permissions: Permission[]) => {
  useAuthStore.setState({
    user: { ...baseUser, id: "viewer", email: "viewer@test.com", role, permissions },
    isAuthenticated: true,
  });
};

const FULL = [
  Permission.UsersRead,
  Permission.UsersWrite,
  Permission.RolesRead,
  Permission.PermissionSetsRead,
  Permission.AdminsRead,
  Permission.AdminsWrite,
];

let accessRequests = 0;
let putBody: unknown = null;

beforeEach(() => {
  accessRequests = 0;
  putBody = null;
  server.use(
    http.get("*/api/v1/admin/users/:id/access", () => {
      accessRequests += 1;
      return HttpResponse.json(access);
    }),
    http.get("*/api/v1/admin/rbac/roles", () => HttpResponse.json({ data: roleOptions })),
    http.get("*/api/v1/admin/rbac/permission-sets", () => HttpResponse.json({ data: [] })),
    http.put("*/api/v1/admin/users/:id/roles", async ({ request }) => {
      putBody = await request.json();
      return HttpResponse.json(access);
    }),
  );
});

afterEach(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

describe("UserAccessPanel", () => {
  it.each([
    ["roles", "*/api/v1/admin/rbac/roles", "admin:rbac.access.manageRoles"],
    ["sets", "*/api/v1/admin/rbac/permission-sets", "admin:rbac.access.manageSets"],
  ])("blocks managing %s when their list fails to load", async (_kind, url, button) => {
    viewer(SystemRole.ADMIN, FULL);
    server.use(http.get(url, () => new HttpResponse(null, { status: 500 })));
    renderWithProviders(<UserAccessPanel user={baseUser} isSelf={false} />);

    expect(await screen.findByText("admin:rbac.access.assign.listError")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: button })).toBeDisabled();
  });

  it("shows where each effective permission comes from", async () => {
    viewer(SystemRole.ADMIN, FULL);
    renderWithProviders(<UserAccessPanel user={baseUser} isSelf={false} />);

    const profile = await screen.findByTestId(`effective-${Permission.SelfProfileUpdate}`);
    expect(within(profile).getByText("admin:rbac.access.source.role · member")).toBeInTheDocument();

    const support = screen.getByTestId(`effective-${Permission.SelfSupportCreate}`);
    expect(within(support).getByText("admin:rbac.access.source.role · member")).toBeInTheDocument();
    expect(
      within(support).getByText("admin:rbac.access.source.permission_set · support_self"),
    ).toBeInTheDocument();
  });

  it("assigns a role with an expiry date and keeps the permanent user role", async () => {
    viewer(SystemRole.ADMIN, FULL);
    const user = userEvent.setup();
    renderWithProviders(<UserAccessPanel user={baseUser} isSelf={false} />);

    await user.click(await screen.findByRole("button", { name: "admin:rbac.access.manageRoles" }));
    await user.click(await screen.findByRole("checkbox", { name: /Premium/ }));
    fireEvent.change(screen.getByLabelText(/admin:rbac.access.assign.expiresLabel · Premium/), {
      target: { value: "2030-01-02T10:00" },
    });
    await user.click(screen.getByRole("button", { name: "admin:rbac.access.assign.save" }));

    await waitFor(() => {
      expect(putBody).not.toBeNull();
    });
    expect(putBody).toEqual({
      assignments: [
        { id: "role-member", expires_at: null },
        { id: "role-premium", expires_at: new Date("2030-01-02T10:00").toISOString() },
      ],
    });
  });

  it("warns that an admin role promotes a user to the admin panel", async () => {
    viewer(SystemRole.ADMIN, FULL);
    const user = userEvent.setup();
    renderWithProviders(<UserAccessPanel user={baseUser} isSelf={false} />);

    await user.click(await screen.findByRole("button", { name: "admin:rbac.access.manageRoles" }));
    expect(screen.queryByTestId("assign-warning-promote")).not.toBeInTheDocument();
    await user.click(await screen.findByRole("checkbox", { name: /Support agent/ }));
    expect(screen.getByTestId("assign-warning-promote")).toHaveTextContent(
      "admin:rbac.access.assign.promoteWarning",
    );
  });

  it("refuses to save without a permanent user role", async () => {
    viewer(SystemRole.ADMIN, FULL);
    const user = userEvent.setup();
    renderWithProviders(<UserAccessPanel user={baseUser} isSelf={false} />);

    await user.click(await screen.findByRole("button", { name: "admin:rbac.access.manageRoles" }));
    await user.click(await screen.findByRole("checkbox", { name: /Member/ }));
    expect(screen.getByText("admin:rbac.access.assign.userRoleRequired")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "admin:rbac.access.assign.save" })).toBeDisabled();
  });

  it("hides admin-audience roles from a viewer without admins:write", async () => {
    viewer(SystemRole.ADMIN, [Permission.UsersRead, Permission.UsersWrite, Permission.RolesRead]);
    const user = userEvent.setup();
    renderWithProviders(<UserAccessPanel user={baseUser} isSelf={false} />);

    await user.click(await screen.findByRole("button", { name: "admin:rbac.access.manageRoles" }));
    expect(await screen.findByRole("checkbox", { name: /Premium/ })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Support agent/ })).not.toBeInTheDocument();
  });

  it("shows a superadmin read-only: no assignment buttons", async () => {
    viewer(SystemRole.SUPERADMIN, []);
    renderWithProviders(
      <UserAccessPanel user={{ ...baseUser, role: SystemRole.SUPERADMIN }} isSelf={false} />,
    );

    expect(await screen.findByText("admin:rbac.access.superadminNote")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "admin:rbac.access.manageRoles" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "admin:rbac.access.manageSets" }),
    ).not.toBeInTheDocument();
  });

  it("shows a permission note, not an error, for an admin target without admins:read", () => {
    viewer(SystemRole.ADMIN, [Permission.UsersRead, Permission.UsersWrite]);
    renderWithProviders(
      <UserAccessPanel user={{ ...baseUser, role: SystemRole.ADMIN }} isSelf={false} />,
    );

    expect(screen.getByText("admin:rbac.access.forbiddenNote")).toBeInTheDocument();
    expect(accessRequests).toBe(0);
  });

  it("falls back to the permission note when the API answers 403", async () => {
    server.use(
      http.get("*/api/v1/admin/users/:id/access", () =>
        HttpResponse.json({ detail: "error.auth.insufficient_permissions" }, { status: 403 }),
      ),
    );
    viewer(SystemRole.ADMIN, FULL);
    renderWithProviders(
      <UserAccessPanel user={{ ...baseUser, role: SystemRole.ADMIN }} isSelf={false} />,
    );

    expect(await screen.findByText("admin:rbac.access.forbiddenNote")).toBeInTheDocument();
  });

  it("offers no edit on an admin target without admins:write", async () => {
    viewer(SystemRole.ADMIN, [
      Permission.UsersRead,
      Permission.UsersWrite,
      Permission.RolesRead,
      Permission.AdminsRead,
    ]);
    renderWithProviders(
      <UserAccessPanel user={{ ...baseUser, role: SystemRole.ADMIN }} isSelf={false} />,
    );

    await screen.findByTestId("user-access-effective");
    expect(
      screen.queryByRole("button", { name: "admin:rbac.access.manageRoles" }),
    ).not.toBeInTheDocument();
  });

  it("warns that removing the last admin role demotes an admin to a user", async () => {
    const adminRole = {
      id: "role-agent",
      key: "agent",
      name: "Support agent",
      audience: RbacAudience.Admin,
      expires_at: null,
      expired: false,
    };
    server.use(
      http.get("*/api/v1/admin/users/:id/access", () =>
        HttpResponse.json({
          ...access,
          account_role: SystemRole.ADMIN,
          roles: [memberRole, adminRole],
        }),
      ),
    );
    viewer(SystemRole.ADMIN, FULL);
    const user = userEvent.setup();
    renderWithProviders(
      <UserAccessPanel user={{ ...baseUser, role: SystemRole.ADMIN }} isSelf={false} />,
    );

    await user.click(await screen.findByRole("button", { name: "admin:rbac.access.manageRoles" }));
    expect(screen.queryByTestId("assign-warning-demote")).not.toBeInTheDocument();
    await user.click(await screen.findByRole("checkbox", { name: /Support agent/ }));
    expect(screen.getByTestId("assign-warning-demote")).toHaveTextContent(
      "admin:rbac.access.assign.demoteWarning",
    );
  });
});
