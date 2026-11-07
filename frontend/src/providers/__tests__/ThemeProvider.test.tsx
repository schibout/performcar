import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { ThemeProvider } from "../ThemeProvider";

describe("ThemeProvider", () => {
  it("should render children", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div data-testid="child">Test Child</div>
      </ThemeProvider>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Test Child")).toBeInTheDocument();
  });
});
