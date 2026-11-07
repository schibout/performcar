import { screen, waitFor } from "@testing-library/react";
import { delay, http } from "msw";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SystemRole } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";
import { createMockUser } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/test-utils";

import { AuthHydrator } from "../AuthHydrator";

const mockReplace = vi.fn();
let mockPathname = "/en";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
    prefetch: vi.fn(),
  }),
  usePathname: () => mockPathname,
  useParams: () => ({ locale: "en" }),
}));

const PageContent = () => <div data-testid="page-content">page</div>;

const renderHydrator = () =>
  renderWithProviders(
    <AuthHydrator>
      <PageContent />
    </AuthHydrator>,
  );

describe("AuthHydrator render gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/en";
    // Freeze /users/me so the store state set by each test cannot be
    // overwritten by the hydrate effect mid-assertion. The gate under test
    // reads only the store, never the response.
    server.use(http.get("*/api/v1/users/me", () => delay("infinite")));
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isSessionInitialized: false,
    });
  });

  it("renders public home immediately for anonymous visitors", () => {
    renderHydrator();

    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("holds returning visitors on the loader while the session hydrates, even on home", () => {
    useAuthStore.setState({ isAuthenticated: true, isSessionInitialized: false });

    renderHydrator();

    expect(screen.queryByTestId("page-content")).not.toBeInTheDocument();
  });

  it("keeps the loader up while bouncing an admin from home to the admin dashboard", async () => {
    useAuthStore.setState({
      user: createMockUser({ role: SystemRole.ADMIN }),
      isAuthenticated: true,
      isSessionInitialized: true,
    });

    renderHydrator();

    expect(screen.queryByTestId("page-content")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/en/admin/dashboard");
    });
  });

  it("keeps the loader up while bouncing a superadmin from home to the admin dashboard", async () => {
    useAuthStore.setState({
      user: createMockUser({ role: SystemRole.SUPERADMIN }),
      isAuthenticated: true,
      isSessionInitialized: true,
    });

    renderHydrator();

    expect(screen.queryByTestId("page-content")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/en/admin/dashboard");
    });
  });

  it("renders home for an active regular user without redirecting", () => {
    useAuthStore.setState({
      user: createMockUser({ role: SystemRole.USER }),
      isAuthenticated: true,
      isSessionInitialized: true,
    });

    renderHydrator();

    expect(screen.getByTestId("page-content")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("still gates protected routes behind the loader while hydrating", () => {
    mockPathname = "/en/dashboard";

    renderHydrator();

    expect(screen.queryByTestId("page-content")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated visitors of protected routes to login after hydration", async () => {
    mockPathname = "/en/dashboard";
    useAuthStore.setState({ isAuthenticated: false, isSessionInitialized: true });

    renderHydrator();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/en/login?session_expired=true");
    });
  });
});
