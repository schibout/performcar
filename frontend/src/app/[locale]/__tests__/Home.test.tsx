import { screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { getLocalizedPath, ROUTES } from "@/lib/config/routes";
import { useAuthStore } from "@/stores/auth.store";
import { renderWithProviders } from "@/test/test-utils";

import { HomeContent } from "../HomeContent";

// Mock the auth store
vi.mock("@/stores/auth.store", () => ({
  useAuthStore: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => getLocalizedPath(ROUTES.home, "en"),
  useParams: () => ({ locale: "en" }),
}));

describe("Home Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders welcome message and features", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isSessionInitialized: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      setSessionInitialized: vi.fn(),
    });

    renderWithProviders(<HomeContent />);

    expect(screen.getByText("home:title")).toBeInTheDocument();
    expect(screen.getByText("home:subtitle")).toBeInTheDocument();
    expect(screen.getByText("home:features.title")).toBeInTheDocument();
    expect(screen.getByText("home:features.item1")).toBeInTheDocument();
    expect(screen.getByText("home:features.item2")).toBeInTheDocument();
    expect(screen.getByText("home:features.item3")).toBeInTheDocument();
  });

  it("renders login and register buttons for unauthenticated users", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isSessionInitialized: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      setSessionInitialized: vi.fn(),
    });

    renderWithProviders(<HomeContent />);

    expect(screen.getByRole("button", { name: /home:cta\.login/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /home:cta\.register/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /home:cta\.dashboard/i })).not.toBeInTheDocument();
  });

  it("renders dashboard button for authenticated users", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: {
        id: "1",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "USER",
      },
      isAuthenticated: true,
      isLoading: false,
      isSessionInitialized: true,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      setSessionInitialized: vi.fn(),
    });

    renderWithProviders(<HomeContent />);

    // Hero and the closing CTA band both surface the dashboard action.
    const dashboardBtns = screen.getAllByRole("button", { name: /home:cta\.dashboard/i });
    expect(dashboardBtns.length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /home:cta\.login/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /home:cta\.register/i })).not.toBeInTheDocument();
  });
});
