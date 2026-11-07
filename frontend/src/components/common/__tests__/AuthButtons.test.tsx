import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { AuthButtons } from "@/components/common/AuthButtons";
import { Permission } from "@/lib/types/permissions";
import { SystemRole, type User } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";
import { renderWithProviders } from "@/test/test-utils";

afterEach(() => {
  useAuthStore.setState({ user: null });
});

const mockUser = (overrides: Partial<User> = {}): User => ({
  id: "1",
  email: "test@example.com",
  first_name: "Test",
  last_name: "User",
  role: SystemRole.USER,
  is_active: true,
  is_verified: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  title: null,
  deactivated_at: null,
  deletion_scheduled_at: null,
  suspended_at: null,
  ...overrides,
});

describe("AuthButtons", () => {
  it("shows login and register links when unauthenticated", () => {
    renderWithProviders(<AuthButtons user={null} />);
    expect(screen.getByRole("link", { name: /auth:login\.submitButton/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /auth:register\.submitButton/i })).toBeInTheDocument();
  });

  it("exposes a Support entry in the user dropdown (desktop parity with the mobile drawer)", async () => {
    const user = userEvent.setup();
    useAuthStore.setState({ user: mockUser({ permissions: [Permission.SelfSupportRead] }) });
    renderWithProviders(<AuthButtons user={mockUser()} />);

    // Open the avatar dropdown (the only button in the authenticated view).
    await user.click(screen.getByRole("button"));

    expect(await screen.findByRole("menuitem", { name: "common:nav.support" })).toBeInTheDocument();
    // Sanity: the existing entries are still present.
    expect(screen.getByRole("menuitem", { name: "common:nav.profile" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "common:nav.dashboard" })).toBeInTheDocument();
  });

  it("hides the Support entry without self.support:read", async () => {
    const user = userEvent.setup();
    useAuthStore.setState({ user: mockUser({ permissions: [] }) });
    renderWithProviders(<AuthButtons user={mockUser()} />);

    await user.click(screen.getByRole("button"));

    expect(await screen.findByRole("menuitem", { name: "common:nav.profile" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "common:nav.support" })).not.toBeInTheDocument();
  });
});
