// Single source of truth for theme colors.
// Both Tailwind utilities (via emitted CSS variables) and antd ConfigProvider
// tokens read from this file. Edit values here, do NOT add CSS color blocks
// to globals.css.

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

// PERFORM'CAR palette, taken from the reference quote generator: deep slate
// blue surfaces with a vivid blue accent (Tailwind slate/blue family). Dark is
// the reference look and the default theme; light keeps the same identity on
// white surfaces.
export const lightColors: ThemeColors = {
  background: "hsl(210 40% 98%)",
  foreground: "hsl(222 47% 11%)",
  card: "hsl(0 0% 100%)",
  cardForeground: "hsl(222 47% 11%)",
  primary: "hsl(221 83% 53%)",
  primaryForeground: "hsl(210 40% 98%)",
  secondary: "hsl(214 32% 91%)",
  secondaryForeground: "hsl(222 47% 11%)",
  muted: "hsl(210 40% 96%)",
  mutedForeground: "hsl(215 16% 47%)",
  destructive: "hsl(0 72% 51%)",
  destructiveForeground: "hsl(210 40% 98%)",
  border: "hsl(214 32% 88%)",
  input: "hsl(214 32% 88%)",
  ring: "hsl(221 83% 53%)",
};

export const darkColors: ThemeColors = {
  background: "hsl(217 33% 17%)",
  foreground: "hsl(210 40% 98%)",
  card: "hsl(222 47% 11%)",
  cardForeground: "hsl(210 40% 98%)",
  primary: "hsl(217 91% 60%)",
  primaryForeground: "hsl(210 40% 98%)",
  secondary: "hsl(217 24% 26%)",
  secondaryForeground: "hsl(210 40% 98%)",
  muted: "hsl(217 24% 26%)",
  mutedForeground: "hsl(215 20.2% 65.1%)",
  destructive: "hsl(0 62.8% 30.6%)",
  destructiveForeground: "hsl(210 40% 98%)",
  border: "hsl(217 24% 26%)",
  input: "hsl(217 24% 26%)",
  ring: "hsl(224 76% 48%)",
};

// Hex equivalents used as antd ConfigProvider tokens, since antd's algorithmic
// shade derivation (colorPrimaryHover, etc.) needs a parseable color value
// rather than a CSS variable reference.
export const lightAntdTokens = {
  primary: "#2563eb",
  error: "#dc2626",
  // Elevated overlay surface (dropdowns, modals, notifications): the `card`
  // color above, so antd overlays match the app theme.
  bgElevated: "#ffffff",
} as const;

export const darkAntdTokens = {
  primary: "#3b82f6",
  error: "#ef4444",
  bgElevated: "#0f172a",
} as const;

const camelToKebab = (key: string): string => key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

export function colorsToCssDeclarations(colors: ThemeColors): string {
  return (Object.entries(colors) as [keyof ThemeColors, string][])
    .map(([key, value]) => `--${camelToKebab(key)}: ${value};`)
    .join("\n  ");
}

export function buildThemeStyleSheet(): string {
  return `:root {\n  ${colorsToCssDeclarations(lightColors)}\n}\n.dark {\n  ${colorsToCssDeclarations(darkColors)}\n}`;
}
