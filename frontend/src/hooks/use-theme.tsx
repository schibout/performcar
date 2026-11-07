"use client";

import { useTheme as useNextTheme } from "next-themes";

export type Theme = "dark" | "light" | "system";

export const useTheme = () => {
  const { theme, setTheme, resolvedTheme } = useNextTheme();

  return {
    theme: theme as Theme | undefined,
    setTheme: (newTheme: Theme) => {
      setTheme(newTheme);
    },
    resolvedTheme: resolvedTheme as Theme | undefined,
  };
};
