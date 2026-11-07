import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Permission } from "@/lib/types/permissions";
import { RbacAudience, type PermissionSet } from "@/lib/types/rbac";
import { SystemRole } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/test-utils";

import { PermissionSetsContent } from "../PermissionSetsContent";

const stamp = { created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };

const systemSet: PermissionSet = {
  id: "set-system",
  key: "self_basic",
  name: "Basic self service",
  description: null,
  audience: RbacAudience.User,
  is_system: true,
  permissions: [Permission.SelfProfileUpdate],
  ...stamp,
};

const catalog = [
  Permission.UsersRead,
  Permission.UsersWrite,
  Permission.SelfProfileUpdate,
  Permission.SelfSupportCreate,
].map((key) => ({
  key,
  resource: key.split(":")[0],
  action: key.split(":")[1],
  audience: key.startsWith("self.") ? "user" : "admin",
}));

const ALL = [
  Permission.PermissionSetsRead,
  Permission.PermissionSetsWrite,
  Permission.RolesRead,
  Permission.UsersRead,
  Permission.UsersWrite,
  Permission.SelfProfileUpdate,
  Permission.SelfSupportCreate,
];

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

let postBody: unknown = null;

beforeEach(() => {
  postBody = null;
  server.use(
    http.get("*/api/v1/admin/rbac/permission-sets", () => HttpResponse.json({ data: [systemSet] })),
    http.get("*/api/v1/admin/rbac/permissions", () => HttpResponse.json({ data: catalog })),
    http.post("*/api/v1/admin/rbac/permission-sets", async ({ request }) => {
      postBody = await request.json();
      return HttpResponse.json({ ...systemSet, is_system: false }, { status: 201 });
    }),
  );
});

afterEach(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

describe("PermissionSetsContent", () => {
  it("lists a system set read-only, without a delete button", async () => {
    signIn(ALL);
    renderWithProviders(<PermissionSetsContent />);

    const row = await screen.findByTestId("set-row-self_basic");
    expect(within(row).getByText("admin:rbac.system")).toBeInTheDocument();
    expect(
      within(row).queryByRole("button", { name: /admin:rbac\.delete/ }),
    ).not.toBeInTheDocument();
  });

  it("offers only self-service permissions for the user audience", async () => {
    signIn(ALL);
    const user = userEvent.setup();
    renderWithProviders(<PermissionSetsContent />);

    await user.click(await screen.findByRole("button", { name: "admin:rbac.sets.create" }));
    expect(await screen.findByText("admin:permissions.resource.self.profile")).toBeInTheDocument();
    expect(screen.queryByText("admin:permissions.resource.users")).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "admin:rbac.audience.admin" }));
    expect(await screen.findByText("admin:permissions.resource.users")).toBeInTheDocument();
  });

  it("creates a set with the ticked permissions", async () => {
    signIn(ALL);
    const user = userEvent.setup();
    renderWithProviders(<PermissionSetsContent />);

    await user.click(await screen.findByRole("button", { name: "admin:rbac.sets.create" }));
    await user.type(await screen.findByLabelText("admin:rbac.fields.key"), "my_set");
    await user.type(screen.getByLabelText("admin:rbac.fields.name"), "My set");
    await user.click(
      await screen.findByRole("checkbox", { name: "admin:permissions.action.update" }),
    );
    await user.click(screen.getByRole("button", { name: "admin:rbac.create" }));

    await waitFor(() => {
      expect(postBody).not.toBeNull();
    });
    expect(postBody).toEqual({
      key: "my_set",
      name: "My set",
      description: null,
      audience: "user",
      permissions: [Permission.SelfProfileUpdate],
    });
  });

  it("shows a note and blocks saving when the catalog cannot be loaded", async () => {
    server.use(
      http.get("*/api/v1/admin/rbac/permissions", () =>
        HttpResponse.json({ detail: "error.auth.insufficient_permissions" }, { status: 403 }),
      ),
    );
    signIn([Permission.PermissionSetsRead, Permission.PermissionSetsWrite]);
    const user = userEvent.setup();
    renderWithProviders(<PermissionSetsContent />);

    await user.click(await screen.findByRole("button", { name: "admin:rbac.sets.create" }));
    await user.type(await screen.findByLabelText("admin:rbac.fields.key"), "my_set");
    await user.type(screen.getByLabelText("admin:rbac.fields.name"), "My set");

    expect(await screen.findByText("admin:rbac.catalogError")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "admin:rbac.create" })).toBeDisabled();
  });
});
