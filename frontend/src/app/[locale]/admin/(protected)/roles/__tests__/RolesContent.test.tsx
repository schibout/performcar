import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Permission } from "@/lib/types/permissions";
import { RbacAudience, type PermissionSet, type Role } from "@/lib/types/rbac";
import { SystemRole } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/test-utils";

import { RolesContent } from "../RolesContent";

const stamp = { created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };

const makeSet = (id: string, name: string, audience: RbacAudience): PermissionSet => ({
  id,
  key: id,
  name,
  description: null,
  audience,
  is_system: false,
  permissions: [],
  ...stamp,
});

const userSet = makeSet("set-user", "Self service", RbacAudience.User);
const adminSet = makeSet("set-admin", "Moderation", RbacAudience.Admin);

const systemRole: Role = {
  id: "role-system",
  key: "member",
  name: "Member",
  description: null,
  audience: RbacAudience.User,
  is_system: true,
  permission_sets: [{ id: userSet.id, key: userSet.key, name: userSet.name }],
  ...stamp,
};
const customRole: Role = {
  id: "role-custom",
  key: "premium",
  name: "Premium",
  description: null,
  audience: RbacAudience.User,
  is_system: false,
  permission_sets: [],
  ...stamp,
};

const signIn = (permissions: Permission[]) => {
  useAuthStore.setState({
    user: {
      id: "viewer",
      email: "viewer@test.com",
      first_name: "Vic",
      last_name: "Viewer",
      title: null,
      role: SystemRole.ADMIN,
      is_active: true,
      is_verified: true,
      created_at: stamp.created_at,
      updated_at: stamp.updated_at,
      deactivated_at: null,
      deletion_scheduled_at: null,
      suspended_at: null,
      permissions,
    },
    isAuthenticated: true,
  });
};

const WRITER = [Permission.RolesRead, Permission.RolesWrite, Permission.PermissionSetsRead];

let postBody: unknown = null;

beforeEach(() => {
  postBody = null;
  server.use(
    http.get("*/api/v1/admin/rbac/roles", () =>
      HttpResponse.json({ data: [systemRole, customRole] }),
    ),
    http.get("*/api/v1/admin/rbac/permission-sets", () =>
      HttpResponse.json({ data: [userSet, adminSet] }),
    ),
    http.post("*/api/v1/admin/rbac/roles", async ({ request }) => {
      postBody = await request.json();
      return HttpResponse.json(customRole, { status: 201 });
    }),
  );
});

afterEach(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

describe("RolesContent", () => {
  it("creates a role from the permission sets of its audience", async () => {
    signIn(WRITER);
    const user = userEvent.setup();
    renderWithProviders(<RolesContent />);

    await user.click(await screen.findByRole("button", { name: "admin:rbac.roles.create" }));
    await user.type(await screen.findByLabelText("admin:rbac.fields.key"), "vip");
    await user.type(screen.getByLabelText("admin:rbac.fields.name"), "VIP");

    // The default audience is users: the admin set is not offered.
    expect(await screen.findByRole("checkbox", { name: /Self service/ })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Moderation/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /Self service/ }));
    await user.click(screen.getByRole("button", { name: "admin:rbac.create" }));

    await waitFor(() => {
      expect(postBody).not.toBeNull();
    });
    expect(postBody).toEqual({
      key: "vip",
      name: "VIP",
      description: null,
      audience: "user",
      permission_set_ids: ["set-user"],
    });
  });

  it("offers the admin sets once the audience is switched to admins", async () => {
    signIn(WRITER);
    const user = userEvent.setup();
    renderWithProviders(<RolesContent />);

    await user.click(await screen.findByRole("button", { name: "admin:rbac.roles.create" }));
    await user.click(await screen.findByRole("radio", { name: "admin:rbac.audience.admin" }));
    expect(await screen.findByRole("checkbox", { name: /Moderation/ })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Self service/ })).not.toBeInTheDocument();
  });

  it("shows a system role read-only, without a delete button", async () => {
    signIn(WRITER);
    const user = userEvent.setup();
    renderWithProviders(<RolesContent />);

    const row = await screen.findByTestId("role-row-member");
    expect(within(row).getByText("admin:rbac.system")).toBeInTheDocument();
    expect(
      within(row).queryByRole("button", { name: /admin:rbac\.delete/ }),
    ).not.toBeInTheDocument();

    await user.click(within(row).getByRole("button", { name: /admin:rbac\.view/ }));
    expect(await screen.findByLabelText("admin:rbac.fields.name")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "admin:rbac.save" })).not.toBeInTheDocument();
  });

  it("offers a delete on a custom role only", async () => {
    signIn(WRITER);
    renderWithProviders(<RolesContent />);

    const row = await screen.findByTestId("role-row-premium");
    expect(within(row).getByRole("button", { name: /admin:rbac\.delete/ })).toBeInTheDocument();
  });

  it("explains a refused delete (role in use) and keeps the dialog open", async () => {
    server.use(
      http.delete("*/api/v1/admin/rbac/roles/:id", () =>
        HttpResponse.json({ detail: "error.rbac.role_in_use" }, { status: 409 }),
      ),
    );
    signIn(WRITER);
    const user = userEvent.setup();
    renderWithProviders(<RolesContent />);

    const row = await screen.findByTestId("role-row-premium");
    await user.click(within(row).getByRole("button", { name: /admin:rbac\.delete/ }));
    await user.click(
      await screen.findByRole("button", { name: "admin:rbac.roles.delete.confirm" }),
    );

    expect(await screen.findByTestId("rbac-api-error")).toHaveTextContent(
      "errors:error.rbac.role_in_use",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("hides the write actions without roles:write", async () => {
    signIn([Permission.RolesRead]);
    renderWithProviders(<RolesContent />);

    const row = await screen.findByTestId("role-row-premium");
    expect(
      screen.queryByRole("button", { name: "admin:rbac.roles.create" }),
    ).not.toBeInTheDocument();
    expect(
      within(row).queryByRole("button", { name: /admin:rbac\.delete/ }),
    ).not.toBeInTheDocument();
  });

  it("renders the forbidden state without roles:read", () => {
    signIn([]);
    renderWithProviders(<RolesContent />);
    expect(screen.getByText("admin:permissionDenied.title")).toBeInTheDocument();
  });
});
