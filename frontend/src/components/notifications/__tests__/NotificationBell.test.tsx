import { cleanup, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Permission } from "@/lib/types/permissions";
import { SystemRole, type User } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("@/hooks/use-notification-realtime", () => ({ useNotificationRealtime: vi.fn() }));
vi.mock("@/components/notifications/NotificationPanel", () => ({
  NotificationPanel: () => <div>panel</div>,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/en/dashboard",
}));

const makeUser = (role: SystemRole, permissions?: Permission[]): User => ({
  id: "u-1",
  email: "u@test.com",
  first_name: null,
  last_name: null,
  title: null,
  role,
  is_active: true,
  is_verified: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  deactivated_at: null,
  deletion_scheduled_at: null,
  suspended_at: null,
  permissions,
});

beforeEach(() => {
  server.use(
    http.get("*/api/v1/notifications/unread-count", () => HttpResponse.json({ unread_count: 0 })),
  );
});

afterEach(() => {
  cleanup();
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

describe("NotificationBell", () => {
  it("renders the bell with self.notifications:read", () => {
    useAuthStore.setState({
      user: makeUser(SystemRole.USER, [Permission.SelfNotificationsRead]),
      isAuthenticated: true,
    });
    renderWithProviders(<NotificationBell />);
    expect(screen.getByRole("button", { name: "notifications:bell" })).toBeInTheDocument();
  });

  it("renders nothing without it", () => {
    useAuthStore.setState({
      user: makeUser(SystemRole.USER, [Permission.SelfSupportRead]),
      isAuthenticated: true,
    });
    renderWithProviders(<NotificationBell />);
    expect(screen.queryByRole("button", { name: "notifications:bell" })).not.toBeInTheDocument();
  });

  it("renders for a superadmin", () => {
    useAuthStore.setState({ user: makeUser(SystemRole.SUPERADMIN), isAuthenticated: true });
    renderWithProviders(<NotificationBell />);
    expect(screen.getByRole("button", { name: "notifications:bell" })).toBeInTheDocument();
  });
});
