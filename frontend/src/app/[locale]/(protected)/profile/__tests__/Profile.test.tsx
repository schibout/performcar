import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { getLocalizedPath, ROUTES } from "@/lib/config/routes";
import { renderWithProviders } from "@/test/test-utils";

import { ProfileContent } from "../ProfileContent";

// Mock the hooks
const mockUpdateMe = vi.fn();
const mockChangePassword = vi.fn();

const mockDeactivate = vi.fn();
const mockReactivate = vi.fn();

vi.mock("@/hooks/api/use-users", () => ({
  useUpdateMe: () => ({
    mutate: mockUpdateMe,
    isPending: false,
  }),
  useDeactivateMe: () => ({
    mutate: mockDeactivate,
    isPending: false,
  }),
  useReactivateMe: () => ({
    mutate: mockReactivate,
    isPending: false,
  }),
}));

vi.mock("@/hooks/api/use-auth", () => ({
  useChangePasswordMutation: () => ({
    mutate: mockChangePassword,
    isPending: false,
  }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => getLocalizedPath(ROUTES.profile, "en"),
  useParams: () => ({ locale: "en" }),
}));

// Mock useAuthStore
const mockUser = {
  id: "1",
  email: "john@example.com",
  first_name: "John",
  last_name: "Doe",
  title: "Software Engineer",
  role: "user",
  permissions: ["self.profile:update", "self.files:upload"],
};

vi.mock("@/stores/auth.store", () => ({
  useAuthStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const state = { user: mockUser, setUser: vi.fn() };
    return selector ? selector(state) : state;
  }),
}));

describe("Profile Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders profile information tab items correctly", () => {
    renderWithProviders(<ProfileContent />);

    // The identity band replaces the old static page title.
    expect(screen.getByRole("heading", { name: "John Doe" })).toBeInTheDocument();
    expect(screen.getByText(/^profile:info\.title$/i)).toBeInTheDocument();

    // Default view is read mode: values render as info rows, not inputs.
    expect(screen.getByText(/^profile:info\.firstName$/i)).toBeInTheDocument();
    expect(screen.getByText("John")).toBeInTheDocument();
    expect(screen.getByText("Doe")).toBeInTheDocument();
    // Email and title appear in both the identity band and the info rows.
    expect(screen.getAllByText("john@example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Software Engineer").length).toBeGreaterThan(0);
  });

  it("switches to security tab correctly", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfileContent />);

    const securityTab = screen.getByRole("tab", { name: /profile:tabs\.security/i });
    await user.click(securityTab);

    // Wait for animation and content mount
    await waitFor(
      () => {
        expect(screen.getByText(/^profile:security\.title$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/profile:security\.currentPassword/i)).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("shows validation errors in profile info tab", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfileContent />);

    const editButton = screen.getByRole("button", { name: /profile:common:buttons\.edit/i });
    await user.click(editButton);

    const firstNameInput = screen.getByLabelText(/profile:info\.firstName/i);
    // Clear the input
    await user.clear(firstNameInput);

    const submitButton = screen.getByRole("button", { name: /profile:info\.submit/i });
    await user.click(submitButton);

    expect(await screen.findByText(/nameMin/i)).toBeInTheDocument();
  });

  it("successfully calls updateMe on profile info submission", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfileContent />);

    const editButton = screen.getByRole("button", { name: /profile:common:buttons\.edit/i });
    await user.click(editButton);

    const firstNameInput = screen.getByLabelText(/profile:info\.firstName/i);
    const lastNameInput = screen.getByLabelText(/profile:info\.lastName/i);
    const submitButton = screen.getByRole("button", { name: /profile:info\.submit/i });

    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Jane");
    await user.clear(lastNameInput);
    await user.type(lastNameInput, "Smith");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateMe).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: "Jane",
          last_name: "Smith",
        }),
        expect.any(Object),
      );
    });
  });

  it("successfully calls changePassword on security submission", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfileContent />);

    const securityTab = screen.getByRole("tab", { name: /profile:tabs\.security/i });
    await user.click(securityTab);

    // Wait for the security tab content to appear
    const currentPasswordInput = await screen.findByLabelText(/profile:security\.currentPassword/i);
    const newPasswordInput = screen.getByLabelText(/profile:security\.newPassword/i);
    const confirmPasswordInput = screen.getByLabelText(/profile:security\.confirmPassword/i);

    // fireEvent.change sets the value in one shot rather than per-keystroke,
    // which avoids the per-character async validation cascade in antd Form
    // that causes this test to flake under parallel test load.
    fireEvent.change(currentPasswordInput, { target: { value: "password123" } });
    fireEvent.change(newPasswordInput, { target: { value: "Password123!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });

    const submitButton = screen.getByRole("button", { name: /profile:security\.submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith(
        expect.objectContaining({
          new_password: "Password123!",
        }),
        expect.any(Object),
      );
    });
  }, 15000);
});
