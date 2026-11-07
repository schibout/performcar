import { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, it, expect, vi } from "vitest";

import {
  adminKeys,
  useAdminActivities,
  useAdminUser,
  useAdminUserActivities,
  useAdminUsers,
  useChangeAdminUserPassword,
  useDeleteAdminUser,
  useSetAdminPermissions,
  useSuspendAdminUser,
  useUnlockAdminUser,
  useUnsuspendAdminUser,
  useUpdateAdminUser,
} from "@/hooks/api/use-admin";
import { rbacKeys } from "@/hooks/api/use-rbac";
import type { AdminActivity, AdminUser } from "@/lib/types/admin";
import { SystemRole } from "@/lib/types/user";
import { server } from "@/test/msw/server";
import { createWrapper } from "@/test/test-utils";

const mockAdmin: AdminUser = {
  id: "admin-1",
  email: "admin@test.com",
  first_name: "A",
  last_name: "Admin",
  title: null,
  role: SystemRole.ADMIN,
  is_active: true,
  is_verified: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  deactivated_at: null,
  deletion_scheduled_at: null,
  suspended_at: null,
};

const mockActivity: AdminActivity = {
  actor_ref: null,
  user_deleted_at: null,
  id: "a-1",
  user_id: "admin-1",
  user: null,
  activity_type: "login",
  resource_type: "auth",
  resource_id: null,
  details: {},
  status: "success",
  status_code: 200,
  ip_address: "127.0.0.1",
  user_agent: "test",
  created_at: "2026-04-19T12:00:00Z",
};

describe("useSetAdminPermissions", () => {
  it("refreshes the admin lists, the user surfaces, the detail and the access view", async () => {
    server.use(
      http.patch("*/api/v1/admin/admins/admin-1/permissions", () =>
        HttpResponse.json({ message: "ok" }),
      ),
    );
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSetAdminPermissions(), {
      wrapper: createWrapper(client),
    });

    result.current.mutate({ id: "admin-1", payload: { permissions: [] } });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    const invalidated = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    expect(invalidated).toEqual(
      expect.arrayContaining([
        adminKeys.adminsPrefix,
        adminKeys.usersListPrefix,
        adminKeys.stats,
        adminKeys.user("admin-1"),
        rbacKeys.access("admin-1"),
      ]),
    );
  });
});

describe("useAdminUsers", () => {
  it("fetches and returns the users list with total", async () => {
    server.use(
      http.get("*/api/v1/admin/users", () =>
        HttpResponse.json({ data: [mockAdmin], total: 1, skip: 0, limit: 25 }),
      ),
    );
    const { result } = renderHook(() => useAdminUsers({ limit: 25 }), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.total).toBe(1);
    expect(result.current.data?.data[0].email).toBe("admin@test.com");
  });

  it("forwards filter params to the query string", async () => {
    let requestedUrl = "";
    server.use(
      http.get("*/api/v1/admin/users", ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({ data: [], total: 0, skip: 0, limit: 1 });
      }),
    );
    const { result } = renderHook(
      () => useAdminUsers({ limit: 1, is_active: true, role: SystemRole.ADMIN }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(requestedUrl).toContain("is_active=true");
    expect(requestedUrl).toContain("role=admin");
  });
});

describe("useAdminUser", () => {
  it("does not fire when id is undefined", () => {
    const { result } = renderHook(() => useAdminUser(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("fetches a single user by id", async () => {
    server.use(http.get("*/api/v1/admin/users/admin-1", () => HttpResponse.json(mockAdmin)));
    const { result } = renderHook(() => useAdminUser("admin-1"), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.email).toBe("admin@test.com");
  });
});

describe("useAdminActivities", () => {
  it("fetches the activities list", async () => {
    server.use(
      http.post("*/api/v1/admin/activities/search", () =>
        HttpResponse.json({ data: [mockActivity], total: 1, skip: 0, limit: 25 }),
      ),
    );
    const { result } = renderHook(() => useAdminActivities(), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.data[0].activity_type).toBe("login");
  });
});

describe("useAdminUserActivities", () => {
  it("hits the per-user activities endpoint", async () => {
    let requestedUrl = "";
    server.use(
      http.get("*/api/v1/admin/users/admin-1/activities", ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({ data: [mockActivity], total: 1, skip: 0, limit: 20 });
      }),
    );
    const { result } = renderHook(() => useAdminUserActivities("admin-1", { limit: 20 }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(requestedUrl).toContain("/admin/users/admin-1/activities");
    expect(requestedUrl).toContain("limit=20");
  });

  it("stays idle when userId is undefined", () => {
    const { result } = renderHook(() => useAdminUserActivities(undefined), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("admin user mutations", () => {
  it("useUpdateAdminUser PATCHes /admin/users/:id and returns the updated user", async () => {
    let capturedBody: unknown = null;
    server.use(
      http.patch("*/api/v1/admin/users/admin-1", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          user: { ...mockAdmin, first_name: "Renamed" },
          message: "ok",
        });
      }),
    );
    const { result } = renderHook(() => useUpdateAdminUser(), { wrapper: createWrapper() });
    result.current.mutate({ id: "admin-1", payload: { first_name: "Renamed" } });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect((capturedBody as { first_name: string }).first_name).toBe("Renamed");
    expect(result.current.data?.user.first_name).toBe("Renamed");
  });

  it("useSuspendAdminUser POSTs /admin/users/:id/suspend", async () => {
    const handler = vi.fn(() => HttpResponse.json({ success: true, message: "ok" }));
    server.use(http.post("*/api/v1/admin/users/admin-1/suspend", handler));
    const { result } = renderHook(() => useSuspendAdminUser(), { wrapper: createWrapper() });
    result.current.mutate("admin-1");
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(handler).toHaveBeenCalled();
  });

  it("useUnsuspendAdminUser POSTs /admin/users/:id/unsuspend", async () => {
    const handler = vi.fn(() => HttpResponse.json({ success: true, message: "ok" }));
    server.use(http.post("*/api/v1/admin/users/admin-1/unsuspend", handler));
    const { result } = renderHook(() => useUnsuspendAdminUser(), { wrapper: createWrapper() });
    result.current.mutate("admin-1");
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(handler).toHaveBeenCalled();
  });

  it("useUnlockAdminUser POSTs /admin/users/:id/unlock", async () => {
    const handler = vi.fn(() => HttpResponse.json({ success: true, message: "ok" }));
    server.use(http.post("*/api/v1/admin/users/admin-1/unlock", handler));
    const { result } = renderHook(() => useUnlockAdminUser(), { wrapper: createWrapper() });
    result.current.mutate("admin-1");
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(handler).toHaveBeenCalled();
  });

  it("useDeleteAdminUser DELETEs /admin/users/:id", async () => {
    const handler = vi.fn(() => HttpResponse.json({ success: true, message: "ok" }));
    server.use(http.delete("*/api/v1/admin/users/admin-1", handler));
    const { result } = renderHook(() => useDeleteAdminUser(), { wrapper: createWrapper() });
    result.current.mutate("admin-1");
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(handler).toHaveBeenCalled();
  });

  it("useChangeAdminUserPassword POSTs /admin/users/:id/change-password?lang=XX", async () => {
    let requestedUrl = "";
    server.use(
      http.post("*/api/v1/admin/users/admin-1/change-password", ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({ success: true, message: "ok" });
      }),
    );
    const { result } = renderHook(() => useChangeAdminUserPassword(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({ id: "admin-1", lang: "fr" });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(requestedUrl).toContain("lang=fr");
  });
});
