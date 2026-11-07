import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";

import { ProfileInfoTab } from "@/components/profile/ProfileInfoTab";
import { Permission } from "@/lib/types/permissions";
import { useAuthStore } from "@/stores/auth.store";
import { createMockUser } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/test-utils";

const EDIT = "profile:common:buttons.edit";

afterEach(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

describe("ProfileInfoTab", () => {
  it("offers the edit button with self.profile:update", () => {
    useAuthStore.setState({
      user: createMockUser({ permissions: [Permission.SelfProfileUpdate] }),
    });

    renderWithProviders(<ProfileInfoTab />);

    expect(screen.getByRole("button", { name: EDIT })).toBeInTheDocument();
    expect(screen.queryByText("profile:restricted")).not.toBeInTheDocument();
  });

  it("hides the edit button and explains why without self.profile:update", () => {
    useAuthStore.setState({ user: createMockUser({ permissions: [] }) });

    renderWithProviders(<ProfileInfoTab />);

    expect(screen.queryByRole("button", { name: EDIT })).not.toBeInTheDocument();
    expect(screen.getByText("profile:restricted")).toBeInTheDocument();
  });

  it("keeps the permissions the update returns in the store", async () => {
    const permissions = [Permission.SelfProfileUpdate, Permission.SelfSupportRead];
    useAuthStore.setState({ user: createMockUser({ permissions }) });
    server.use(
      http.patch("*/api/v1/users/me", () =>
        HttpResponse.json({
          user: createMockUser({ first_name: "Renamed", permissions }),
          message: "ok",
        }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<ProfileInfoTab />);

    await user.click(screen.getByRole("button", { name: EDIT }));
    await user.click(screen.getByRole("button", { name: "profile:info.submit" }));

    await waitFor(() => {
      expect(useAuthStore.getState().user?.first_name).toBe("Renamed");
    });
    expect(useAuthStore.getState().user?.permissions).toEqual(permissions);
  });
});
