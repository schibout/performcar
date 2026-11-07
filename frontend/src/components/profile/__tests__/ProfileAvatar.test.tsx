import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, it, expect, beforeEach } from "vitest";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import type { FilePublic } from "@/lib/types/file";
import { Permission } from "@/lib/types/permissions";
import { SystemRole, type User } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";
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

const currentUser: User = {
  id: "u-1",
  email: "me@test.com",
  first_name: "Me",
  last_name: "User",
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
  permissions: [Permission.SelfProfileUpdate, Permission.SelfFilesUpload],
};

beforeEach(() => {
  useAuthStore.setState({ user: currentUser });
});

describe("ProfileAvatar", () => {
  it("disables the picker and explains why without self.files:upload", () => {
    useAuthStore.setState({
      user: { ...currentUser, permissions: [Permission.SelfProfileUpdate] },
    });

    renderWithProviders(<ProfileAvatar />);

    expect(screen.getByRole("button", { name: /upload:replace/ })).toBeDisabled();
    expect(screen.getByText("profile:avatar.uploadRestricted")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload:remove/ })).toBeEnabled();
  });

  it("disables removal without self.profile:update", () => {
    useAuthStore.setState({
      user: { ...currentUser, permissions: [Permission.SelfFilesUpload] },
    });

    renderWithProviders(<ProfileAvatar />);

    expect(screen.getByRole("button", { name: /upload:remove/ })).toBeDisabled();
  });

  it("keeps the picker enabled with both self.files:upload and self.profile:update", () => {
    renderWithProviders(<ProfileAvatar />);

    expect(screen.getByRole("button", { name: /upload:replace/ })).toBeEnabled();
    expect(screen.queryByText("profile:avatar.uploadRestricted")).not.toBeInTheDocument();
  });

  it("clears the current user's avatar through updateMe", async () => {
    const user = userEvent.setup();
    let body: { avatar_file_id?: string | null } | null = null;
    server.use(
      http.patch("*/api/v1/users/me", async ({ request }) => {
        body = (await request.json()) as { avatar_file_id?: string | null };
        return HttpResponse.json({ user: { ...currentUser, avatar_file: null }, message: "ok" });
      }),
    );

    renderWithProviders(<ProfileAvatar />);

    await user.click(screen.getByRole("button", { name: /upload:remove/ }));

    await waitFor(() => {
      expect(body?.avatar_file_id).toBeNull();
    });
  });
});
