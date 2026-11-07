import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Permission } from "@/lib/types/permissions";
import { SystemRole, type User } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";
import { renderWithProviders } from "@/test/test-utils";

import { NotificationsContent } from "../NotificationsContent";

vi.mock("@/components/notifications/NotificationsView", () => ({
  NotificationsView: () => <div>inbox</div>,
}));

const makeUser = (permissions: Permission[]): User => ({
  id: "u-1",
  email: "u@test.com",
  first_name: null,
  last_name: null,
  title: null,
  role: SystemRole.USER,
  is_active: true,
  is_verified: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  deactivated_at: null,
  deletion_scheduled_at: null,
  suspended_at: null,
  permissions,
});

afterEach(() => {
  useAuthStore.setState({ user: null });
});

describe("NotificationsContent", () => {
  it("shows the inbox with self.notifications:read", () => {
    useAuthStore.setState({ user: makeUser([Permission.SelfNotificationsRead]) });
    renderWithProviders(<NotificationsContent />);
    expect(screen.getByText("inbox")).toBeInTheDocument();
  });

  it("shows a permission note without it", () => {
    useAuthStore.setState({ user: makeUser([Permission.SelfSupportRead]) });
    renderWithProviders(<NotificationsContent />);
    expect(screen.queryByText("inbox")).not.toBeInTheDocument();
    expect(screen.getByText("notifications:restricted")).toBeInTheDocument();
  });

  it("shows neither while the user is not loaded", () => {
    renderWithProviders(<NotificationsContent />);
    expect(screen.queryByText("inbox")).not.toBeInTheDocument();
    expect(screen.queryByText("notifications:restricted")).not.toBeInTheDocument();
  });
});
