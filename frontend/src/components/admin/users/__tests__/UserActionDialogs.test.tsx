import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { UserActionDialogs } from "@/components/admin/users/UserActionDialogs";

describe("UserActionDialogs", () => {
  it("renders nothing visible when action is null", () => {
    render(
      <UserActionDialogs
        action={null}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isLoading={false}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each([
    ["suspend", "suspendTitle", "suspendConfirm"] as const,
    ["unsuspend", "unsuspendTitle", "unsuspendConfirm"] as const,
    ["unlock", "unlockTitle", "unlockConfirm"] as const,
    ["change-password", "changePasswordTitle", "changePasswordConfirm"] as const,
    ["delete", "deleteTitle", "deleteConfirm"] as const,
  ])("shows the %s dialog with its title and confirm label", (kind, title, confirmKey) => {
    render(
      <UserActionDialogs
        action={kind}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isLoading={false}
      />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`admin:confirm\\.${title}`))).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: new RegExp(`admin:confirm\\.${confirmKey}`) }),
    ).toBeInTheDocument();
  });

  it("fires onConfirm when the confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(
      <UserActionDialogs
        action="suspend"
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        isLoading={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /admin:confirm\.suspendConfirm/ }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("disables the confirm + cancel buttons while loading", () => {
    render(
      <UserActionDialogs action="delete" onOpenChange={vi.fn()} onConfirm={vi.fn()} isLoading />,
    );
    expect(screen.getByRole("button", { name: /admin:confirm\.deleteConfirm/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /admin:confirm\.cancel/ })).toBeDisabled();
  });
});
