import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { UsersFilters } from "@/components/admin/users/UsersFilters";

const buildProps = (overrides: Partial<React.ComponentProps<typeof UsersFilters>> = {}) => ({
  search: "",
  onSearchChange: vi.fn(),
  role: "all" as const,
  onRoleChange: vi.fn(),
  status: "all" as const,
  onStatusChange: vi.fn(),
  verified: "all" as const,
  onVerifiedChange: vi.fn(),
  onReset: vi.fn(),
  hasFilters: false,
  ...overrides,
});

describe("UsersFilters", () => {
  it("emits search changes", () => {
    const props = buildProps();
    render(<UsersFilters {...props} />);
    fireEvent.change(screen.getByPlaceholderText(/admin:users\.filters\.searchPlaceholder/), {
      target: { value: "ada" },
    });
    expect(props.onSearchChange).toHaveBeenCalledWith("ada");
  });

  it("hides the reset button when there are no filters", () => {
    render(<UsersFilters {...buildProps({ hasFilters: false })} />);
    expect(
      screen.queryByRole("button", { name: /admin:users\.filters\.reset/ }),
    ).not.toBeInTheDocument();
  });

  it("shows the reset button and fires onReset when there are filters", () => {
    const props = buildProps({ hasFilters: true });
    render(<UsersFilters {...props} />);
    const button = screen.getByRole("button", { name: /admin:users\.filters\.reset/ });
    fireEvent.click(button);
    expect(props.onReset).toHaveBeenCalled();
  });

  it("exposes all three select controls with accessible labels", () => {
    render(<UsersFilters {...buildProps()} />);
    expect(screen.getByLabelText(/admin:users\.filters\.role/)).toBeInTheDocument();
    expect(screen.getByLabelText(/admin:users\.filters\.status/)).toBeInTheDocument();
    expect(screen.getByLabelText(/admin:users\.filters\.verified/)).toBeInTheDocument();
  });
});
