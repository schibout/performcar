import { screen, waitFor, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { getLocalizedPath, ROUTES } from "@/lib/config/routes";
import { SystemRole } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";
import { renderWithProviders } from "@/test/test-utils";

// Mock the components since we don't have a single App component in Next.js App Router
// In a real scenario, you'd test the specific page or layout.
// Here we'll mock a generic Home and Dashboard to demonstrate integration logic.
const MockHome = () => (
  <div>
    <h1>home:title</h1>
    <button
      onClick={() => {
        window.location.assign("/dashboard");
      }}
    >
      home:cta.dashboard
    </button>
  </div>
);

const MockDashboard = () => (
  <div>
    <h1>dashboard:title</h1>
    <p>dashboard:welcome</p>
  </div>
);

// Simplified App mock for integration demonstration
const MockApp = () => {
  const { user } = useAuthStore();
  return user ? <MockDashboard /> : <MockHome />;
};

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => getLocalizedPath(ROUTES.home, "en"),
  useParams: () => ({ locale: "en" }),
}));

describe("Authentication Integration", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
    vi.clearAllMocks();
  });

  it("should show home page when accessing root without token", async () => {
    act(() => {
      renderWithProviders(<MockApp />);
    });

    // Check if Home page is displayed
    await waitFor(() => {
      expect(screen.getByText(/home:title/i)).toBeInTheDocument();
    });
  });

  it("should allow access to dashboard when token exists", async () => {
    // Simulate logged in state
    const mockUser = {
      id: "1",
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      title: "Mr",
      role: SystemRole.USER,
      is_active: true,
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deactivated_at: null,
      deletion_scheduled_at: null,
      suspended_at: null,
    };

    act(() => {
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        isSessionInitialized: true,
      });
    });

    act(() => {
      renderWithProviders(<MockApp />);
    });

    // Dashboard should be visible
    await waitFor(() => {
      expect(screen.getByText(/dashboard:title/i)).toBeInTheDocument();
      expect(screen.getByText(/dashboard:welcome/i)).toBeInTheDocument();
    });
  });
});
