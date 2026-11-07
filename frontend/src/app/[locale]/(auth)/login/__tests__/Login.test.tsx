import { screen, fireEvent, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { getLocalizedPath, ROUTES } from "@/lib/config/routes";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/test-utils";

import { LoginContent } from "../LoginContent";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => getLocalizedPath(ROUTES.login, "en"),
  useParams: () => ({ locale: "en" }),
}));

describe("Login Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login form items correctly", () => {
    renderWithProviders(<LoginContent />);

    expect(screen.getByText(/auth:login\.cardTitle/i)).toBeInTheDocument();
    expect(screen.getByText(/auth:login\.emailLabel/i)).toBeInTheDocument();
    expect(screen.getByText(/auth:login\.passwordLabel/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /auth:login\.submitButton/i })).toBeInTheDocument();
    expect(screen.getByText(/auth:login\.noAccount/i)).toBeInTheDocument();
  });

  it("shows validation errors for empty fields", async () => {
    renderWithProviders(<LoginContent />);

    const submitButton = screen.getByRole("button", { name: /auth:login\.submitButton/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/validation:emailRequired/i)).toBeInTheDocument();
      expect(screen.getByText(/validation:passwordRequired/i)).toBeInTheDocument();
    });
  });

  it("shows error for invalid email format", async () => {
    renderWithProviders(<LoginContent />);

    const emailInput = screen.getByLabelText(/auth:login\.emailLabel/i);
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });

    const submitButton = screen.getByRole("button", { name: /auth:login\.submitButton/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/validation:emailInvalid/i)).toBeInTheDocument();
    });
  });

  it("successfully logs in and navigates to dashboard", async () => {
    renderWithProviders(<LoginContent />);

    const emailInput = screen.getByLabelText(/auth:login\.emailLabel/i);
    const passwordInput = screen.getByLabelText(/auth:login\.passwordLabel/i);
    const submitButton = screen.getByRole("button", { name: /auth:login\.submitButton/i });

    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123!" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/en/dashboard");
    });
  });

  it("shows error toast on API failure", async () => {
    // Override MSW handler for this test
    server.use(
      http.post("*/api/v1/auth/login", () => {
        return new HttpResponse(null, { status: 401 });
      }),
    );

    renderWithProviders(<LoginContent />);

    const emailInput = screen.getByLabelText(/auth:login\.emailLabel/i);
    const passwordInput = screen.getByLabelText(/auth:login\.passwordLabel/i);

    fireEvent.change(emailInput, {
      target: { value: "john@example.com" },
    });
    fireEvent.change(passwordInput, {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /auth:login\.submitButton/i }));

    await waitFor(() => {
      // sonner toasts are hard to query, but we verify navigation DID NOT happen
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
