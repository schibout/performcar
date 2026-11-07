import { screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { useResendVerificationMutation } from "@/hooks/api/use-auth";
import { getLocalizedPath, ROUTES } from "@/lib/config/routes";
import { renderWithProviders } from "@/test/test-utils";

import { VerifyEmailNoticeContent } from "../VerifyEmailNoticeContent";

// Mock the auth hooks
const mockResendEmail = vi.fn();
vi.mock("@/hooks/api/use-auth", () => ({
  useResendVerificationMutation: vi.fn(),
}));

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: vi.fn(),
  }),
  usePathname: () => getLocalizedPath(ROUTES.verifyEmailNotice, "en"),
  useParams: () => ({ locale: "en" }),
}));

const PENDING_EMAIL_KEY = "pendingVerifyEmail";

describe("VerifyEmailNoticeContent Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.removeItem(PENDING_EMAIL_KEY);
    vi.mocked(useResendVerificationMutation).mockReturnValue({
      mutate: mockResendEmail,
      isPending: false,
      isSuccess: false,
      reset: vi.fn(),
      mutateAsync: vi.fn(),
      variables: undefined,
      error: null,
      data: undefined,
      status: "idle",
      isError: false,
      isIdle: true,
      isPaused: false,
      failureCount: 0,
      failureReason: null,
      submittedAt: 0,
    } as unknown as ReturnType<typeof useResendVerificationMutation>);
  });

  it("redirects to login if no pending email is stored", async () => {
    renderWithProviders(<VerifyEmailNoticeContent />);
    // The component reads sessionStorage on mount and replaces to /login when empty.
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  it("renders the email correctly and it is read-only", () => {
    const testEmail = "test@example.com";
    window.sessionStorage.setItem(PENDING_EMAIL_KEY, testEmail);
    renderWithProviders(<VerifyEmailNoticeContent />);

    const emailInput = screen.getByLabelText(/auth:login\.emailLabel/i);
    expect(emailInput).toHaveValue(testEmail);
    expect(emailInput).toHaveAttribute("readonly");
  });

  it("calls resendEmail when button is clicked", async () => {
    const testEmail = "test@example.com";
    window.sessionStorage.setItem(PENDING_EMAIL_KEY, testEmail);
    renderWithProviders(<VerifyEmailNoticeContent />);

    const resendButton = screen.getByRole("button", { name: /auth:verifyEmail\.resendButton/i });
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(mockResendEmail).toHaveBeenCalledWith({ email: testEmail });
    });
  });

  it("shows success message after successful resend", () => {
    const testEmail = "test@example.com";
    window.sessionStorage.setItem(PENDING_EMAIL_KEY, testEmail);

    vi.mocked(useResendVerificationMutation).mockReturnValue({
      mutate: mockResendEmail,
      isPending: false,
      isSuccess: true,
    } as unknown as ReturnType<typeof useResendVerificationMutation>);

    renderWithProviders(<VerifyEmailNoticeContent />);

    expect(screen.getByText(/auth:verifyEmail\.resendSuccess/i)).toBeInTheDocument();
  });

  it("clears the pending email when 'back to login' is clicked", () => {
    const testEmail = "test@example.com";
    window.sessionStorage.setItem(PENDING_EMAIL_KEY, testEmail);
    renderWithProviders(<VerifyEmailNoticeContent />);

    fireEvent.click(screen.getByRole("link", { name: /auth:verifyEmail\.backToLogin/i }));
    expect(window.sessionStorage.getItem(PENDING_EMAIL_KEY)).toBeNull();
  });

  it("shows loading state when resending", () => {
    const testEmail = "test@example.com";
    window.sessionStorage.setItem(PENDING_EMAIL_KEY, testEmail);

    vi.mocked(useResendVerificationMutation).mockReturnValue({
      mutate: mockResendEmail,
      isPending: true,
      isSuccess: false,
    } as unknown as ReturnType<typeof useResendVerificationMutation>);

    renderWithProviders(<VerifyEmailNoticeContent />);

    const resendButton = screen.getByRole("button", { name: /auth:login\.submitting/i });

    expect(resendButton).toBeInTheDocument();
    expect(resendButton).toBeDisabled();
  });
});
