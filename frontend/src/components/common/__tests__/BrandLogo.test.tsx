import { screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { BrandLogo, DEFAULT_LOGO_URL } from "@/components/common/BrandLogo";
import { useBranding } from "@/hooks/use-branding";
import { renderWithProviders } from "@/test/test-utils";

vi.mock("@/hooks/use-branding", () => ({
  useBranding: vi.fn(),
}));

describe("BrandLogo", () => {
  it("renders the logo image (uncropped, object-contain) when a logo URL is set", () => {
    vi.mocked(useBranding).mockReturnValue({
      siteName: "Acme",
      logoUrl: "https://cdn.example.com/logo.png",
    });

    renderWithProviders(<BrandLogo className="h-8 w-8" />);

    const img = screen.getByRole("img", { name: "Acme" });
    // next/image rewrites src to its optimizer URL; the original is encoded in it.
    expect(img.getAttribute("src")).toContain("cdn.example.com");
    expect(img.className).toContain("object-contain");
  });

  it("falls back to the PERFORM'CAR mark when no logo is set", () => {
    vi.mocked(useBranding).mockReturnValue({ siteName: "Acme", logoUrl: "" });

    renderWithProviders(<BrandLogo className="h-8 w-8" />);

    const img = screen.getByRole("img", { name: "Acme" });
    expect(img.getAttribute("src")).toContain(encodeURIComponent(DEFAULT_LOGO_URL));
  });
});
