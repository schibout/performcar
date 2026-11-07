import { screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { authService } from "@/lib/api/endpoints/auth";
import { getLocalizedPath, ROUTES } from "@/lib/config/routes";
import { renderWithProviders } from "@/test/test-utils";

import { VerifyEmailContent } from "../VerifyEmailContent";

// Mock the authService
vi.mock("@/lib/api/endpoints/auth", () => ({
  authService: {
    verifyEmail: vi.fn(),
  },
}));

// Mock next/navigation
const mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => getLocalizedPath(ROUTES.verifyEmail, "en"),
  useParams: () => ({ locale: "en" }),
  useSearchParams: () => mockSearchParams,
}));

describe("VerifyEmailContent Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete("token");
  });

  it("shows invalid link state if token is missing", () => {
    renderWithProviders(<VerifyEmailContent />);
    expect(screen.getByText("auth:verifyEmail.invalidLinkTitle")).toBeDefined();
  });

  it("shows success state when verification succeeds", async () => {
    mockSearchParams.set("token", "test-token");
    vi.mocked(authService.verifyEmail).mockResolvedValueOnce({
      success: true,
      message: "Success",
    });

    renderWithProviders(<VerifyEmailContent />);

    await waitFor(() => {
      expect(screen.getByText("auth:verifyEmail.successTitle")).toBeDefined();
    });
  });

  it("shows error state when verification fails", async () => {
    mockSearchParams.set("token", "test-token");
    vi.mocked(authService.verifyEmail).mockRejectedValueOnce({
      response: { data: { detail: "Expired token" } },
    });

    renderWithProviders(<VerifyEmailContent />);

    await waitFor(() => {
      expect(screen.getByText("auth:verifyEmail.failedTitle")).toBeDefined();
      expect(screen.getByText("Expired token")).toBeDefined();
    });
  });
});
