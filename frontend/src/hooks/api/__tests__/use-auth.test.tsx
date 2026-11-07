import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { Permission } from "@/lib/types/permissions";
import { SystemRole } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";
import { createMockUser } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";
import { createWrapper } from "@/test/test-utils";

import { useLoginMutation } from "../use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/en/login",
  useParams: () => ({ locale: "en" }),
}));

const mockLoginResponse = (role: SystemRole) => {
  server.use(
    http.post("*/api/v1/auth/login", () =>
      HttpResponse.json({
        token_type: "bearer",
        user: createMockUser({ role }),
        message: "success.auth.login",
      }),
    ),
  );
};

describe("useLoginMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isSessionInitialized: false,
    });
  });

  it("stores the permissions the login response lists, with no /users/me fetch", async () => {
    const permissions = [Permission.SelfNotificationsRead, Permission.SelfSupportRead];
    let meRequests = 0;
    server.use(
      http.post("*/api/v1/auth/login", () =>
        HttpResponse.json({
          token_type: "bearer",
          user: createMockUser({ permissions }),
          message: "success.auth.login",
        }),
      ),
      http.get("*/api/v1/users/me", () => {
        meRequests += 1;
        return HttpResponse.json(createMockUser());
      }),
    );
    const { result } = renderHook(() => useLoginMutation(), { wrapper: createWrapper() });

    result.current.mutate({ email: "john@example.com", password: "password123!" });

    await waitFor(() => {
      expect(useAuthStore.getState().user?.permissions).toEqual(permissions);
    });
    expect(useAuthStore.getState().isSessionInitialized).toBe(true);
    expect(meRequests).toBe(0);
  });

  it("routes a regular user to the dashboard", async () => {
    mockLoginResponse(SystemRole.USER);
    const { result } = renderHook(() => useLoginMutation(), { wrapper: createWrapper() });

    result.current.mutate({ email: "john@example.com", password: "password123!" });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/en/dashboard");
    });
  });

  it("routes an admin straight to the admin dashboard", async () => {
    mockLoginResponse(SystemRole.ADMIN);
    const { result } = renderHook(() => useLoginMutation(), { wrapper: createWrapper() });

    result.current.mutate({ email: "john@example.com", password: "password123!" });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/en/admin/dashboard");
    });
  });

  it("routes a superadmin straight to the admin dashboard (no double redirect)", async () => {
    mockLoginResponse(SystemRole.SUPERADMIN);
    const { result } = renderHook(() => useLoginMutation(), { wrapper: createWrapper() });

    result.current.mutate({ email: "john@example.com", password: "password123!" });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/en/admin/dashboard");
    });
  });

  it("keeps isPending true while the post-login redirect is in flight", async () => {
    mockLoginResponse(SystemRole.USER);
    const { result } = renderHook(() => useLoginMutation(), { wrapper: createWrapper() });

    result.current.mutate({ email: "john@example.com", password: "password123!" });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });
    // The mutation has settled, but the login surface must stay in its
    // loading state until navigation unmounts it.
    expect(result.current.isPending).toBe(true);
  });

  it("drops isPending back to false on a failed login", async () => {
    server.use(http.post("*/api/v1/auth/login", () => new HttpResponse(null, { status: 401 })));
    const { result } = renderHook(() => useLoginMutation(), { wrapper: createWrapper() });

    result.current.mutate({ email: "john@example.com", password: "wrong" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.isPending).toBe(false);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
