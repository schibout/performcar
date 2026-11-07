import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { useLocalStorage } from "../useLocalStorage";

describe("useLocalStorage", () => {
  const key = "test-key";
  const initialValue = { name: "initial" };

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("should initialize with initial value if localStorage is empty", () => {
    const { result } = renderHook(() => useLocalStorage(key, initialValue));
    expect(result.current[0]).toEqual(initialValue);
  });

  it("should initialize with value from localStorage if it exists", () => {
    const storedValue = { name: "stored" };
    window.localStorage.setItem(key, JSON.stringify(storedValue));

    const { result } = renderHook(() => useLocalStorage(key, initialValue));
    expect(result.current[0]).toEqual(storedValue);
  });

  it("should update localStorage when value changes", () => {
    const { result } = renderHook(() => useLocalStorage(key, initialValue));
    const newValue = { name: "updated" };

    act(() => {
      result.current[1](newValue);
    });

    expect(result.current[0]).toEqual(newValue);
    const storedItem = window.localStorage.getItem(key);
    if (!storedItem) throw new Error("Item not found in localStorage");
    expect(JSON.parse(storedItem)).toEqual(newValue);
  });

  it("should support functional updates", () => {
    const key = "count";
    const initialValue = 0;
    const { result } = renderHook(() => useLocalStorage(key, initialValue));

    const increment = (prev: number) => prev + 1;
    act(() => {
      result.current[1](increment);
    });

    expect(result.current[0]).toBe(1);
    expect(window.localStorage.getItem(key)).toBe("1");
  });
});
