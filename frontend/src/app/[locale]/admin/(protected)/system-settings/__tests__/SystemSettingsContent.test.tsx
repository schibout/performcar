import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Permission } from "@/lib/types/permissions";
import { SystemRole } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/test-utils";

import { SystemSettingsContent } from "../SystemSettingsContent";

// src/test/setup.ts stubs this module globally; these tests need the real query.
vi.unmock("@/hooks/api/use-system-settings");

const SETTINGS_URL = "*/api/v1/admin/system-settings";

const setAdmin = (permissions: Permission[]) => {
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
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deactivated_at: null,
      deletion_scheduled_at: null,
      suspended_at: null,
      permissions,
    },
    isAuthenticated: true,
  });
};

const spyOnSettingsList = () => {
  const onList = vi.fn();
  server.use(
    http.get(SETTINGS_URL, () => {
      onList();
      return HttpResponse.json({ data: [] });
    }),
  );
  return onList;
};

afterEach(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

describe("SystemSettingsContent", () => {
  it("does not request the settings without system_settings:read", async () => {
    setAdmin([]);
    const onList = spyOnSettingsList();

    renderWithProviders(<SystemSettingsContent />);

    expect(await screen.findByText(/permissionDenied\.title/)).toBeInTheDocument();
    // Let any request the mount would have started reach the handler.
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(onList).not.toHaveBeenCalled();
  });

  it("requests the settings with system_settings:read", async () => {
    setAdmin([Permission.SystemSettingsRead]);
    const onList = spyOnSettingsList();

    renderWithProviders(<SystemSettingsContent />);

    await waitFor(() => {
      expect(onList).toHaveBeenCalledTimes(1);
    });
  });
});
