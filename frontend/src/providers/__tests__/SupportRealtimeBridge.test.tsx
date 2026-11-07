import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SystemRole } from "@/lib/types/user";
import { SupportRealtimeBridge } from "@/providers/SupportRealtimeBridge";

// Store actions the bridge is expected to drive off auth state.
const { connect, disconnect } = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock("@/stores/support-realtime.store", () => ({
  useSupportRealtimeStore: (selector: (s: { connect: unknown; disconnect: unknown }) => unknown) =>
    selector({ connect, disconnect }),
}));

// Mutable auth state the mocked store reads through the selector.
const { authState } = vi.hoisted(() => ({
  authState: {
    user: null as { id: string; role: string; permissions?: string[] } | null,
    isAuthenticated: false,
  },
}));

vi.mock("@/stores/auth.store", () => ({
  useAuthStore: (selector: (s: typeof authState) => unknown) => selector(authState),
}));

const renderBridge = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SupportRealtimeBridge />
    </QueryClientProvider>,
  );

beforeEach(() => {
  authState.user = null;
  authState.isAuthenticated = false;
  vi.clearAllMocks();
});

describe("SupportRealtimeBridge", () => {
  it("does not connect when unauthenticated", () => {
    renderBridge();
    expect(connect).not.toHaveBeenCalled();
  });

  it("connects after login and forwards the admin flag", () => {
    authState.user = { id: "u-1", role: SystemRole.ADMIN, permissions: ["support:read"] };
    authState.isAuthenticated = true;

    renderBridge();

    expect(connect).toHaveBeenCalledWith(expect.objectContaining({ isAdmin: true }));
  });

  it("connects a user holding self.support:read", () => {
    authState.user = { id: "u-1", role: SystemRole.USER, permissions: ["self.support:read"] };
    authState.isAuthenticated = true;

    renderBridge();

    expect(connect).toHaveBeenCalledWith(expect.objectContaining({ isAdmin: false }));
  });

  it("connects a superadmin without an explicit permission list", () => {
    authState.user = { id: "u-1", role: SystemRole.SUPERADMIN };
    authState.isAuthenticated = true;

    renderBridge();

    expect(connect).toHaveBeenCalled();
  });

  it("never opens the socket without the permission, and opens it once granted", () => {
    authState.user = { id: "u-1", role: SystemRole.USER, permissions: ["self.notifications:read"] };
    authState.isAuthenticated = true;

    const view = renderBridge();
    expect(connect).not.toHaveBeenCalled();

    authState.user = {
      id: "u-1",
      role: SystemRole.USER,
      permissions: ["self.notifications:read", "self.support:read"],
    };
    view.rerender(
      <QueryClientProvider client={new QueryClient()}>
        <SupportRealtimeBridge />
      </QueryClientProvider>,
    );
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("does not connect while the user is not loaded", () => {
    authState.isAuthenticated = true;

    renderBridge();

    expect(connect).not.toHaveBeenCalled();
  });

  it("disconnects on unmount", () => {
    authState.user = { id: "u-1", role: SystemRole.USER, permissions: ["self.support:read"] };
    authState.isAuthenticated = true;

    const { unmount } = renderBridge();
    unmount();

    expect(disconnect).toHaveBeenCalled();
  });
});
