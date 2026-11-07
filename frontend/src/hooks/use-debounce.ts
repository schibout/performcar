import { useState, useEffect } from "react";

/**
 * Debounce hook - Updates the value if it doesn't change within the specified duration
 * @param value - The value to debounce
 * @param delay - Delay duration in milliseconds
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Update the value after the delay duration
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: If the value changes again within the delay duration, cancel the previous timeout
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
