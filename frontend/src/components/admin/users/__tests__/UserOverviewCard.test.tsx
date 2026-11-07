import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { UserOverviewCard } from "@/components/admin/users/UserOverviewCard";
import type { AdminUser } from "@/lib/types/admin";
import { SystemRole } from "@/lib/types/user";

const user: AdminUser = {
  id: "abcdef0123456789",
  email: "u@test.com",
  first_name: "U",
  last_name: "Ser",
  title: null,
  role: SystemRole.USER,
  is_active: true,
  is_verified: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  deactivated_at: null,
  deletion_scheduled_at: null,
  suspended_at: null,
};

describe("UserOverviewCard", () => {
  it("renders the first 12 chars of the id", () => {
    render(<UserOverviewCard user={user} />);
    expect(screen.getByText("abcdef012345")).toBeInTheDocument();
  });

  it("renders an em-dash for null date fields", () => {
    render(<UserOverviewCard user={user} />);
    // Both deactivated_at and deletion_scheduled_at are null → two em-dashes.
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });
});
