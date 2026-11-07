import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  useCanCloseOwnTicket,
  useCanCreateOwnTicket,
  useCanDeleteAdmins,
  useCanDeleteUsers,
  useCanReadAdmins,
  useCanReadOwnNotifications,
  useCanReadOwnSupport,
  useCanReplyOwnTicket,
  useCanUpdateOwnProfile,
  useCanUploadOwnFiles,
  useCanReadUsers,
  useCanWriteAdmins,
  useIsSuperadmin,
  usePermissions,
} from "@/hooks/use-permissions";
import { Permission } from "@/lib/types/permissions";
import { SystemRole, type User } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";

function makeUser(role: SystemRole, permissions?: Permission[]): User {
  return {
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
  };
}

afterEach(() => {
  useAuthStore.setState({ user: null });
});

describe("usePermissions", () => {
  it("denies everything for a regular user", () => {
    useAuthStore.setState({ user: makeUser(SystemRole.USER) });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isSuperadmin).toBe(false);
    expect(result.current.has(Permission.UsersRead)).toBe(false);
  });

  it("grants only the listed permissions for an admin", () => {
    useAuthStore.setState({ user: makeUser(SystemRole.ADMIN, [Permission.UsersRead]) });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.has(Permission.UsersRead)).toBe(true);
    expect(result.current.has(Permission.UsersDelete)).toBe(false);
    expect(result.current.permissions).toEqual([Permission.UsersRead]);
  });

  it("grants every permission for a superadmin", () => {
    useAuthStore.setState({ user: makeUser(SystemRole.SUPERADMIN) });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isSuperadmin).toBe(true);
    expect(result.current.has(Permission.UsersDelete)).toBe(true);
    expect(result.current.has(Permission.StatsRead)).toBe(true);
  });

  it("returns false when there is no user", () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.has(Permission.UsersRead)).toBe(false);
  });
});

describe("per-permission hooks", () => {
  it("reflect the admin's grant set", () => {
    useAuthStore.setState({ user: makeUser(SystemRole.ADMIN, [Permission.UsersRead]) });
    expect(renderHook(() => useCanReadUsers()).result.current).toBe(true);
    expect(renderHook(() => useCanDeleteUsers()).result.current).toBe(false);
    expect(renderHook(() => useIsSuperadmin()).result.current).toBe(false);
  });

  it("gate the admin management keys one by one", () => {
    useAuthStore.setState({ user: makeUser(SystemRole.ADMIN, [Permission.AdminsRead]) });
    expect(renderHook(() => useCanReadAdmins()).result.current).toBe(true);
    expect(renderHook(() => useCanWriteAdmins()).result.current).toBe(false);
    expect(renderHook(() => useCanDeleteAdmins()).result.current).toBe(false);
  });

  it("are all true for a superadmin", () => {
    useAuthStore.setState({ user: makeUser(SystemRole.SUPERADMIN) });
    expect(renderHook(() => useCanDeleteUsers()).result.current).toBe(true);
    expect(renderHook(() => useIsSuperadmin()).result.current).toBe(true);
  });
});

describe("self-service hooks", () => {
  const selfHooks = [
    [useCanUpdateOwnProfile, Permission.SelfProfileUpdate],
    [useCanUploadOwnFiles, Permission.SelfFilesUpload],
    [useCanReadOwnNotifications, Permission.SelfNotificationsRead],
    [useCanReadOwnSupport, Permission.SelfSupportRead],
    [useCanCreateOwnTicket, Permission.SelfSupportCreate],
    [useCanReplyOwnTicket, Permission.SelfSupportReply],
    [useCanCloseOwnTicket, Permission.SelfSupportClose],
  ] as const;

  it("each follows exactly its own key", () => {
    for (const [hook, key] of selfHooks) {
      useAuthStore.setState({ user: makeUser(SystemRole.USER, [key]) });
      expect(renderHook(() => hook()).result.current).toBe(true);
      useAuthStore.setState({ user: makeUser(SystemRole.USER, [Permission.UsersRead]) });
      expect(renderHook(() => hook()).result.current).toBe(false);
    }
  });

  it("deny a restricted account that only reads its tickets", () => {
    useAuthStore.setState({ user: makeUser(SystemRole.USER, [Permission.SelfSupportRead]) });
    expect(renderHook(() => useCanReadOwnSupport()).result.current).toBe(true);
    expect(renderHook(() => useCanCreateOwnTicket()).result.current).toBe(false);
    expect(renderHook(() => useCanReplyOwnTicket()).result.current).toBe(false);
    expect(renderHook(() => useCanReadOwnNotifications()).result.current).toBe(false);
  });

  it("are all true for a superadmin and all false while the user is not loaded", () => {
    for (const [hook] of selfHooks) {
      useAuthStore.setState({ user: makeUser(SystemRole.SUPERADMIN) });
      expect(renderHook(() => hook()).result.current).toBe(true);
      useAuthStore.setState({ user: null });
      expect(renderHook(() => hook()).result.current).toBe(false);
    }
  });

  it("reports readiness only once the user is loaded", () => {
    expect(renderHook(() => usePermissions()).result.current.isReady).toBe(false);
    useAuthStore.setState({ user: makeUser(SystemRole.USER, []) });
    expect(renderHook(() => usePermissions()).result.current.isReady).toBe(true);
  });
});
