import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";

import { CreateUserModal } from "@/components/admin/users/CreateUserModal";
import { Permission } from "@/lib/types/permissions";
import { RbacAudience } from "@/lib/types/rbac";
import { useAuthStore } from "@/stores/auth.store";
import { createMockUser } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/test-utils";

const role = (id: string, key: string, audience: RbacAudience) => ({
  id,
  key,
  name: key,
  description: null,
  audience,
  is_system: true,
});

afterEach(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

describe("CreateUserModal", () => {
  it("creates the account and keeps the default role without a roles call", async () => {
    useAuthStore.setState({
      user: createMockUser({ permissions: [Permission.UsersWrite, Permission.RolesRead] }),
    });
    let created: unknown = null;
    let rolesCalled = false;
    server.use(
      http.get("*/api/v1/admin/rbac/roles", () =>
        HttpResponse.json({
          data: [
            role("r-user", "user", RbacAudience.User),
            role("r-admin", "administrator", RbacAudience.Admin),
          ],
        }),
      ),
      http.post("*/api/v1/admin/users", async ({ request }) => {
        created = await request.json();
        return HttpResponse.json(
          { user: { id: "new-id" }, message: "success.user.created" },
          { status: 201 },
        );
      }),
      http.put("*/api/v1/admin/users/:id/roles", () => {
        rolesCalled = true;
        return HttpResponse.json({});
      }),
    );

    renderWithProviders(<CreateUserModal open onClose={() => undefined} />);
    const user = userEvent.setup();
    // The roles field (with the default role preselected) appears once the list loads.
    expect(
      await screen.findByText("user", { selector: ".ant-select-selection-item-content" }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText(/users\.create\.emailLabel/), "jo@example.com");
    await user.type(screen.getByLabelText(/users\.create\.firstNameLabel/), "Jo");
    await user.type(screen.getByLabelText(/users\.create\.lastNameLabel/), "Doe");
    await user.type(screen.getByLabelText(/users\.create\.passwordLabel/), "Password123!");
    await user.click(screen.getByRole("button", { name: /users\.create\.submit/ }));

    await waitFor(() => {
      expect(created).toMatchObject({ email: "jo@example.com", password: "Password123!" });
    });
    expect(rolesCalled).toBe(false);
  });
});
