import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { StatusBadge, UserStatusBadge } from "@/components/admin/shared/StatusBadge";
import type { AdminUser } from "@/lib/types/admin";
import { SystemRole } from "@/lib/types/user";

const baseUser: AdminUser = {
  id: "u1",
  email: "u@test.com",
  first_name: "U",
  last_name: "Ser",
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

describe("StatusBadge", () => {
  it("renders children", () => {
    render(<StatusBadge tone="success">hello</StatusBadge>);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });
});

describe("UserStatusBadge", () => {
  it("shows 'suspended' when suspended_at is set (wins over every other state)", () => {
    render(
      <UserStatusBadge
        user={{
          ...baseUser,
          is_active: false,
          suspended_at: "2026-04-20T10:00:00Z",
          // Both pending-deletion and suspended set at once — suspended still wins.
          deletion_scheduled_at: "2026-05-01T00:00:00Z",
        }}
      />,
    );
    expect(screen.getByText(/admin:users\.status\.suspended/)).toBeInTheDocument();
  });

  it("shows 'pending deletion' when deletion_scheduled_at is set (takes priority over active)", () => {
    render(
      <UserStatusBadge
        user={{ ...baseUser, is_active: true, deletion_scheduled_at: "2026-05-01T00:00:00Z" }}
      />,
    );
    expect(screen.getByText(/admin:users\.status\.pendingDeletion/)).toBeInTheDocument();
  });

  it("shows 'active' for an active user without scheduled deletion", () => {
    render(<UserStatusBadge user={baseUser} />);
    expect(screen.getByText(/admin:users\.status\.active/)).toBeInTheDocument();
  });

  it("shows 'inactive' for a deactivated user", () => {
    render(<UserStatusBadge user={{ ...baseUser, is_active: false }} />);
    expect(screen.getByText(/admin:users\.status\.inactive/)).toBeInTheDocument();
  });
});
