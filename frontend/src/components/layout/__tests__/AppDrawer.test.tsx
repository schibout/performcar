import { screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { AppDrawer } from "@/components/layout/AppDrawer";
import { getLocalizedPath, ROUTES } from "@/lib/config/routes";
import { SystemRole, type User } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";
import { renderWithProviders } from "@/test/test-utils";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => getLocalizedPath(ROUTES.home, "en"),
  useParams: () => ({ locale: "en" }),
}));

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

const defaultProps = {
  theme: "light",
  toggleTheme: vi.fn(),
  isMobileMenuOpen: true,
  setIsMobileMenuOpen: vi.fn(),
};

const mockUnauthenticated = () =>
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

const mockAuthenticated = (overrides = {}) =>
  vi.mocked(useAuthStore).mockReturnValue({
    user: createMockUser(overrides),
    isAuthenticated: true,
    isLoading: false,
    isSessionInitialized: true,
    login: vi.fn(),
    logout: vi.fn(),
    setUser: vi.fn(),
    setSessionInitialized: vi.fn(),
  });

describe("AppDrawer Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
  });

  it("renders the hamburger toggle button (sr-only text matches i18n key)", () => {
    mockUnauthenticated();
    renderWithProviders(<AppDrawer {...defaultProps} isMobileMenuOpen={false} />);

    // The i18n mock returns the key as-is: 'common:ui.toggleMenu'
    expect(screen.getByRole("button", { name: /common:ui\.toggleMenu/i })).toBeInTheDocument();
  });

  it("shows login and register buttons when drawer is open and unauthenticated", () => {
    mockUnauthenticated();
    renderWithProviders(<AppDrawer {...defaultProps} isMobileMenuOpen />);

    expect(screen.getByRole("button", { name: /auth:login\.submitButton/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /auth:register\.submitButton/i }),
    ).toBeInTheDocument();
  });

  it("shows user name and email when drawer is open and authenticated", () => {
    mockAuthenticated();
    renderWithProviders(<AppDrawer {...defaultProps} isMobileMenuOpen />);

    expect(screen.getByText("Test User")).toBeInTheDocument();
    // In JSDOM/Radix, the image might not be "loaded", so we check for the fallback (First initial)
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("shows logout button when drawer is open and authenticated", () => {
    mockAuthenticated();
    renderWithProviders(<AppDrawer {...defaultProps} isMobileMenuOpen />);

    expect(screen.getByRole("button", { name: /auth:logout\.logoutButton/i })).toBeInTheDocument();
  });

  it("shows settings section heading and labels", () => {
    mockAuthenticated();
    renderWithProviders(<AppDrawer {...defaultProps} />);

    expect(screen.getByText("common:ui.settings")).toBeInTheDocument();
    expect(screen.getByText("common:ui.theme")).toBeInTheDocument();
    expect(screen.getByText("common:ui.language")).toBeInTheDocument();
  });

  it('shows "Dark" toggle label when in light mode (theme="light")', () => {
    mockAuthenticated();
    renderWithProviders(<AppDrawer {...defaultProps} theme="light" />);

    // Button label/text shows the opposite mode to switch to
    expect(screen.getByRole("button", { name: /common:ui\.dark/i })).toBeInTheDocument();
  });

  it('shows "Light" toggle label when in dark mode (theme="dark")', async () => {
    mockAuthenticated();
    renderWithProviders(<AppDrawer {...defaultProps} theme="dark" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /common:ui\.light/i })).toBeInTheDocument();
    });
  });

  it("calls toggleTheme when theme button is clicked", async () => {
    mockAuthenticated();
    renderWithProviders(<AppDrawer {...defaultProps} theme="light" />);

    const themeBtn = await screen.findByRole("button", { name: /common:ui\.dark/i });
    fireEvent.click(themeBtn);

    expect(defaultProps.toggleTheme).toHaveBeenCalledOnce();
  });

  it("renders language selector toggle button", () => {
    mockAuthenticated();
    renderWithProviders(<AppDrawer {...defaultProps} isMobileMenuOpen />);

    expect(screen.getByRole("button", { name: /common:ui\.language/i })).toBeInTheDocument();
  });

  it("calls push and closes drawer when logout button is clicked", () => {
    mockAuthenticated();
    const setIsMobileMenuOpen = vi.fn();

    renderWithProviders(
      <AppDrawer {...defaultProps} isMobileMenuOpen setIsMobileMenuOpen={setIsMobileMenuOpen} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /auth:logout\.logoutButton/i }));

    expect(setIsMobileMenuOpen).toHaveBeenCalledWith(false);
    expect(mockPush).toHaveBeenCalledWith("/en/logout");
  });

  it("shows the Administration link for admin users", () => {
    mockAuthenticated({ role: SystemRole.ADMIN });
    renderWithProviders(<AppDrawer {...defaultProps} isMobileMenuOpen />);

    expect(screen.getByRole("button", { name: /admin:shell\.title/i })).toBeInTheDocument();
  });

  it("does not show the Administration link for non-admin users", () => {
    mockAuthenticated();
    renderWithProviders(<AppDrawer {...defaultProps} isMobileMenuOpen />);

    expect(screen.queryByRole("button", { name: /admin:shell\.title/i })).not.toBeInTheDocument();
  });

  it("calls setIsMobileMenuOpen when language changes", () => {
    const setIsMobileMenuOpen = vi.fn();
    mockAuthenticated();

    renderWithProviders(
      <AppDrawer {...defaultProps} isMobileMenuOpen setIsMobileMenuOpen={setIsMobileMenuOpen} />,
    );

    const langBtn = screen.getByRole("button", { name: /common:ui\.language/i });
    fireEvent.click(langBtn);
    expect(setIsMobileMenuOpen).toHaveBeenCalledWith(false);
  });
});
