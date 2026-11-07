import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, describe, it, expect } from "vitest";

import { UserAvatarCard } from "@/components/admin/users/UserAvatarCard";
import type { AdminUser } from "@/lib/types/admin";
import type { FilePublic } from "@/lib/types/file";
import { Permission } from "@/lib/types/permissions";
import { SystemRole } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";
import { createMockUser } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/test-utils";

const avatar: FilePublic = {
  id: "f-1",
  url: "https://cdn.test/a.png",
  content_type: "image/png",
  size: 1234,
  filename: "a.png",
  category: "general",
  created_at: "2026-01-01T00:00:00Z",
};

const userWithAvatar: AdminUser = {
  id: "u-1",
  email: "u1@test.com",
  first_name: "Ann",
  last_name: "Active",
  title: null,
  role: SystemRole.USER,
  is_active: true,
  is_verified: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  deactivated_at: null,
  deletion_scheduled_at: null,
  suspended_at: null,
  avatar_file: avatar,
};

const RESTRICTED = "admin:userDetail.avatarUploadRestricted";

afterEach(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

describe("UserAvatarCard", () => {
  it("disables the picker and explains why without self.files:upload, keeping Remove", () => {
    useAuthStore.setState({ user: createMockUser({ permissions: [Permission.UsersWrite] }) });

    renderWithProviders(<UserAvatarCard user={userWithAvatar} />);

    expect(screen.getByRole("button", { name: /upload:replace/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /upload:remove/ })).toBeEnabled();
    expect(screen.getByText(RESTRICTED)).toBeInTheDocument();
  });

  it("keeps the picker enabled with self.files:upload", () => {
    useAuthStore.setState({
      user: createMockUser({ permissions: [Permission.UsersWrite, Permission.SelfFilesUpload] }),
    });

    renderWithProviders(<UserAvatarCard user={userWithAvatar} />);

    expect(screen.getByRole("button", { name: /upload:replace/ })).toBeEnabled();
    expect(screen.queryByText(RESTRICTED)).not.toBeInTheDocument();
  });

  it("does not show the confirm modal until remove is clicked", () => {
    renderWithProviders(<UserAvatarCard user={userWithAvatar} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("confirms removal in a modal and clears the avatar via PATCH", async () => {
    const user = userEvent.setup();
    let body: { avatar_file_id?: string | null } | null = null;
    server.use(
      http.patch("*/api/v1/admin/users/u-1", async ({ request }) => {
        body = (await request.json()) as { avatar_file_id?: string | null };
        return HttpResponse.json({ user: { ...userWithAvatar, avatar_file: null }, message: "ok" });
      }),
    );

    renderWithProviders(<UserAvatarCard user={userWithAvatar} />);

    await user.click(screen.getByRole("button", { name: /upload:remove/ }));

    // The destructive removal is gated behind a confirm modal.
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/admin:userDetail\.removeAvatarTitle/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /admin:userDetail\.removeAvatarConfirm/ }));

    await waitFor(() => {
      expect(body?.avatar_file_id).toBeNull();
    });
  });
});
