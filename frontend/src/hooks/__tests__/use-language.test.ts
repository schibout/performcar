import { renderHook, act } from "@testing-library/react";
import { useTranslation } from "react-i18next";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useLanguage } from "../use-language";

vi.mock("react-i18next", () => ({
  useTranslation: vi.fn(),
}));

describe("useLanguage", () => {
  const mockChangeLanguage = vi.fn();
  const mockPushState = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useTranslation).mockReturnValue({
      t: (key: string) => key,
      i18n: {
        language: "en",
        changeLanguage: mockChangeLanguage,
        options: {},
        isInitialized: true,
        on: vi.fn(),
        off: vi.fn(),
        t: (key: string) => key,
      },
      ready: true,
    } as unknown as ReturnType<typeof useTranslation>);

    vi.spyOn(window.history, "pushState").mockImplementation(mockPushState);

    // Mock window.location
    Object.defineProperty(window, "location", {
      value: { pathname: "/en/dashboard" },
      writable: true,
    });
  });

  it("should return current language", () => {
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language).toBe("en");
  });

  it("should change language and redirect correctly", () => {
    const { result } = renderHook(() => useLanguage());

    act(() => {
      result.current.changeLanguage("fr");
    });

    expect(mockChangeLanguage).toHaveBeenCalledWith("fr");
    expect(mockPushState).toHaveBeenCalledWith(null, "", "/fr/dashboard");
    expect(document.cookie).toContain("NEXT_LOCALE=fr");
  });

  it("should handle paths without locale prefix", () => {
    window.location.pathname = "/profile";
    const { result } = renderHook(() => useLanguage());

    act(() => {
      result.current.changeLanguage("fr");
    });

    expect(mockPushState).toHaveBeenCalledWith(null, "", "/fr/profile");
  });
});
