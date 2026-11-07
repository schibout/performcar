import { renderHook, act } from "@testing-library/react";
import { useTheme as useNextTheme } from "next-themes";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useTheme } from "../use-theme";

vi.mock("next-themes", () => ({
  useTheme: vi.fn(),
}));

describe("useTheme", () => {
  const mockSetTheme = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNextTheme).mockReturnValue({
      theme: "light",
      setTheme: mockSetTheme,
      resolvedTheme: "light",
      themes: ["light", "dark"],
      systemTheme: "light",
      forcedTheme: undefined,
    } as unknown as ReturnType<typeof useNextTheme>);
  });

  it("should return current theme and resolvedTheme", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
    expect(result.current.resolvedTheme).toBe("light");
  });

  it("should call setTheme correctly", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("dark");
    });

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });
});
