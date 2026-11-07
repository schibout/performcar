import { screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { AppHeader } from "@/components/layout/AppHeader";
import { getLocalizedPath, ROUTES } from "@/lib/config/routes";
import { SystemRole, type User } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";
import { renderWithProviders } from "@/test/test-utils";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => getLocalizedPath(ROUTES.home, "en"),
  useParams: () => ({ locale: "en" }),
}));

// Mock the auth store
vi.mock("@/stores/auth.store", () => ({
  useAuthStore: vi.fn(),
}));

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: "1",
  email: "test@example.com",
  first_name: "Test",
  last_name: "User",
  role: SystemRole.USER,
  is_active: true,
  is_verified: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  title: null,
  deactivated_at: null,
  deletion_scheduled_at: null,
  suspended_at: null,
  ...overrides,
});

// AppHeader consumes the store with a selector (`(state) => state.user`),
// so the mock has to honour the selector instead of returning the full state.
const mockAuthStore = (overrides: {
  user?: User | null;
  isAuthenticated?: boolean;
  isLoading?: boolean;
  isSessionInitialized?: boolean;
}) => {
  const state = {
    user: overrides.user ?? null,
    isAuthenticated: overrides.isAuthenticated ?? false,
    isLoading: overrides.isLoading ?? false,
    isSessionInitialized: overrides.isSessionInitialized ?? false,
    login: vi.fn(),
    logout: vi.fn(),
    setUser: vi.fn(),
    setSessionInitialized: vi.fn(),
  };
  // The real `useAuthStore` is overloaded (with/without selector). vi.mocked
  // preserves the overloaded signature, which mockImplementation can't
  // satisfy directly, so cast through a minimal matching type.
  const mock = vi.mocked(useAuthStore) as unknown as {
    mockImplementation: (fn: (selector?: (s: typeof state) => unknown) => unknown) => void;
  };
  mock.mockImplementation((selector) => (typeof selector === "function" ? selector(state) : state));
};

describe("AppHeader Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login and register links when unauthenticated", () => {
    mockAuthStore({ user: null, isAuthenticated: false });

    renderWithProviders(<AppHeader />);

    // AuthButtons now uses asChild + <Link> for the unauth CTAs so cmd-click
    // opens in a new tab — the role is "link", not "button".
    expect(screen.getByRole("link", { name: /auth:login\.submitButton/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /auth:register\.submitButton/i })).toBeInTheDocument();
  });

  it("renders user dropdown menu when authenticated", () => {
    mockAuthStore({
      user: createMockUser({ email: "test@example.com", first_name: "Test", last_name: "User" }),
      isAuthenticated: true,
      isSessionInitialized: true,
    });

    renderWithProviders(<AppHeader />);

    expect(screen.queryByRole("link", { name: /auth\.login/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /auth\.register/i })).not.toBeInTheDocument();

    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("renders theme and language toggle buttons", () => {
    mockAuthStore({ user: null, isAuthenticated: false });

    renderWithProviders(<AppHeader />);

    expect(screen.getByRole("button", { name: /common:ui\.toggleTheme/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /common:ui\.toggleLanguage/i })).toBeInTheDocument();
  });
});
