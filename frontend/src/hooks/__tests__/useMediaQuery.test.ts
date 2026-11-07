import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useMediaQuery, useIsMobile } from "../useMediaQuery";

describe("useMediaQuery", () => {
  beforeEach(() => {
    // Media query mocking is already set up in src/test/setup.ts
    // but we can locally mock it if needed
  });

  it("should return initial match state", () => {
    // Mocking window.matchMedia to return matches: true
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query === "(min-width: 1024px)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useMediaQuery("(min-width: 1024px)"));
    expect(result.current).toBe(true);

    const { result: result2 } = renderHook(() => useMediaQuery("(max-width: 500px)"));
    expect(result2.current).toBe(false);
  });

  it("should update matches when media query changes", () => {
    let changeHandler: ((e: { matches: boolean }) => void) | undefined;
    const mockMedia = {
      matches: false,
      media: "(max-width: 768px)",
      addEventListener: vi
        .fn()
        .mockImplementation((event: string, handler: (e: { matches: boolean }) => void) => {
          if (event === "change") changeHandler = handler;
        }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
    } as unknown as MediaQueryList;

    vi.spyOn(window, "matchMedia").mockReturnValue(mockMedia);

    const { result } = renderHook(() => useMediaQuery("(max-width: 768px)"));
    expect(result.current).toBe(false);

    // Simulate change
    act(() => {
      // Mutate the object properties so the hook sees the new value
      (mockMedia as { matches: boolean }).matches = true;
      if (changeHandler) {
        changeHandler({ matches: true });
      }
    });

    expect(result.current).toBe(true);
  });

  it("useIsMobile should work correctly", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query) =>
        ({
          matches: query === "(max-width: 768px)",
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });
});
