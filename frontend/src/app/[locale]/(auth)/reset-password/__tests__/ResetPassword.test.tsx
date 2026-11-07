import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { authService } from "@/lib/api/endpoints/auth";
import { getLocalizedPath, ROUTES } from "@/lib/config/routes";
import { renderWithProviders } from "@/test/test-utils";

import { ResetPasswordContent } from "../ResetPasswordContent";

// Mock the authService
vi.mock("@/lib/api/endpoints/auth", () => ({
  authService: {
    resetPassword: vi.fn(),
  },
}));

// Mock next/navigation
const mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => getLocalizedPath(ROUTES.resetPassword, "en"),
  useParams: () => ({ locale: "en" }),
  useSearchParams: () => mockSearchParams,
}));

describe("ResetPasswordContent Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete("token");
  });

  it("shows invalid link state if token is missing", () => {
    renderWithProviders(<ResetPasswordContent />);
    expect(screen.getByText("auth:resetPassword.invalidLinkTitle")).toBeDefined();
  });

  it("renders reset password form when token is present", () => {
    mockSearchParams.set("token", "test-token");
    renderWithProviders(<ResetPasswordContent />);
    expect(screen.getByText("auth:resetPassword.title")).toBeDefined();
    expect(screen.getByLabelText("auth:resetPassword.newPassword")).toBeDefined();
    expect(screen.getByLabelText("auth:resetPassword.confirmNewPassword")).toBeDefined();
  });

  it("shows success message on successful reset", async () => {
    mockSearchParams.set("token", "test-token");
    vi.mocked(authService.resetPassword).mockResolvedValueOnce({
      success: true,
      message: "Success",
    });

    renderWithProviders(<ResetPasswordContent />);

    const passwordInput = screen.getByLabelText("auth:resetPassword.newPassword");
    const confirmInput = screen.getByLabelText("auth:resetPassword.confirmNewPassword");

    fireEvent.change(passwordInput, { target: { value: "newPassword123!" } });
    fireEvent.change(confirmInput, { target: { value: "newPassword123!" } });

    const submitButton = screen.getByRole("button", { name: "auth:resetPassword.submitButton" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("auth:resetPassword.successTitle")).toBeDefined();
    });
  });

  it("shows error when passwords do not match", async () => {
    mockSearchParams.set("token", "test-token");
    renderWithProviders(<ResetPasswordContent />);

    const passwordInput = screen.getByLabelText("auth:resetPassword.newPassword");
    const confirmInput = screen.getByLabelText("auth:resetPassword.confirmNewPassword");

    fireEvent.change(passwordInput, { target: { value: "pass1" } });
    fireEvent.change(confirmInput, { target: { value: "pass2" } });

    const submitButton = screen.getByRole("button", { name: "auth:resetPassword.submitButton" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(authService.resetPassword).not.toHaveBeenCalled();
    });
  });
});
