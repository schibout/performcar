import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAccountEvents } from "@/hooks/use-account-events";
import type { AccountEvent } from "@/schemas/account";
import { createTestQueryClient, createWrapper } from "@/test/test-utils";

// Mock the socket factory so events can be fired by hand, the auth store so
// the gate can be flipped, and getMe so session re-validation is observable.
const { sockets, authState, getMe } = vi.hoisted(() => ({
  sockets: [] as {
    onEvent: (event: AccountEvent) => void;
    close: ReturnType<typeof vi.fn>;
  }[],
  authState: {
    isAuthenticated: true,
    setUser: vi.fn(),
  },
  getMe: vi.fn(),
}));

vi.mock("@/lib/websocket/account-socket", () => ({
  createAccountSocket: (onEvent: (event: AccountEvent) => void) => {
    const socket = { onEvent, close: vi.fn() };
    sockets.push(socket);
    return socket;
  },
}));

vi.mock("@/stores/auth.store", () => ({
  useAuthStore: (selector: (s: typeof authState) => unknown) => selector(authState),
}));

vi.mock("@/lib/api/endpoints/auth", () => ({
  authService: { getMe: () => getMe() as Promise<unknown> },
}));

afterEach(() => {
  sockets.length = 0;
  authState.isAuthenticated = true;
  vi.clearAllMocks();
});

describe("useAccountEvents", () => {
  it("refetches /users/me and stores the result on permissions_updated", async () => {
    const me = { id: "u-1", permissions: ["users:read"] };
    getMe.mockResolvedValue(me);

    renderHook(
      () => {
        useAccountEvents();
      },
      { wrapper: createWrapper() },
    );

    expect(sockets).toHaveLength(1);
    sockets[0].onEvent({ type: "permissions_updated" });

    await waitFor(() => {
      expect(authState.setUser).toHaveBeenCalledWith(me);
    });
  });

  it("invalidates the sessions cache on sessions_revoked when this device survives", async () => {
    getMe.mockResolvedValue({ id: "u-1" });
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");

    renderHook(
      () => {
        useAccountEvents();
      },
      { wrapper: createWrapper(client) },
    );

    sockets[0].onEvent({ type: "sessions_revoked" });

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["sessions"] });
    });
  });

  it("swallows the refetch failure when this device's session was revoked", async () => {
    // The 401 path (logout + redirect) is owned by the api layer; the hook
    // must simply not crash or touch the store.
    getMe.mockRejectedValue(new Error("401"));
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");

    renderHook(
      () => {
        useAccountEvents();
      },
      { wrapper: createWrapper(client) },
    );

    sockets[0].onEvent({ type: "sessions_revoked" });

    await waitFor(() => {
      expect(getMe).toHaveBeenCalledTimes(1);
    });
    expect(authState.setUser).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("closes the socket on unmount and skips guests", () => {
    const { unmount } = renderHook(
      () => {
        useAccountEvents();
      },
      { wrapper: createWrapper() },
    );
    unmount();
    expect(sockets[0].close).toHaveBeenCalledTimes(1);

    authState.isAuthenticated = false;
    renderHook(
      () => {
        useAccountEvents();
      },
      { wrapper: createWrapper() },
    );
    expect(sockets).toHaveLength(1); // no second socket for the guest
  });
});
