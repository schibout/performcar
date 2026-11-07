import React from "react";

import { screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { authService } from "@/lib/api/endpoints/auth";
import { getLocalizedPath, ROUTES } from "@/lib/config/routes";
import { renderWithProviders } from "@/test/test-utils";

import { ForgotPasswordContent } from "../ForgotPasswordContent";

// Mock the authService
vi.mock("@/lib/api/endpoints/auth", () => ({
  authService: {
    forgotPassword: vi.fn(),
  },
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => getLocalizedPath(ROUTES.forgotPassword, "en"),
  useParams: () => ({ locale: "en" }),
}));

describe("ForgotPasswordContent Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders forgot password form", () => {
    renderWithProviders(<ForgotPasswordContent />);
    // In our mock, t(key) returns key
    expect(screen.getByText("auth:forgotPassword.title")).toBeDefined();
    expect(screen.getByLabelText("auth:forgotPassword.emailLabel")).toBeDefined();
    expect(screen.getByRole("button", { name: "auth:forgotPassword.submitButton" })).toBeDefined();
  });

  it("shows success message on successful submission", async () => {
    vi.mocked(authService.forgotPassword).mockResolvedValueOnce({
      success: true,
      message: "Token sent",
    });

    renderWithProviders(<ForgotPasswordContent />);

    const emailInput = screen.getByPlaceholderText("kemalcalak@gmail.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", { name: "auth:forgotPassword.submitButton" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("auth:forgotPassword.successTitle")).toBeDefined();
      expect(screen.getByText("test@example.com")).toBeDefined();
    });
  });

  it("shows error message on failure", async () => {
    vi.mocked(authService.forgotPassword).mockRejectedValueOnce({
      response: { data: { detail: "Email not found" } },
    });

    renderWithProviders(<ForgotPasswordContent />);

    const emailInput = screen.getByPlaceholderText("kemalcalak@gmail.com");
    fireEvent.change(emailInput, { target: { value: "error@example.com" } });

    const submitButton = screen.getByRole("button", { name: "auth:forgotPassword.submitButton" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Email not found")).toBeDefined();
    });
  });
});
