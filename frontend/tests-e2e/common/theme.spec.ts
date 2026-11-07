import { test, expect } from "../base-test";

test.describe("Theme and Dark Mode Persistence", () => {
  test("should toggle dark mode via the header toggle", async ({ page }) => {
    await page.goto("/fr");

    // The button has "Changer de thème" or "Toggle theme". The footer ships its
    // own toggle too, so scope to the header (banner) explicitly.
    const themeBtn = page
      .getByRole("banner")
      .getByRole("button", { name: /Changer de thème|Toggle theme/i });
    await expect(themeBtn).toBeVisible();

    // Default could be anything, so we just toggle it
    await themeBtn.click();

    // Check if any of them changed to dark or light explicitly
    const currentTheme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(currentTheme).not.toBeNull();

    // Toggle again
    await themeBtn.click();
    const nextTheme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(nextTheme).not.toBe(currentTheme);
  });

  test("should preserve theme after page reload", async ({ page }) => {
    await page.goto("/en");

    // Let's force it to 'dark' for testing
    await page.evaluate(() => {
      localStorage.setItem("theme", "dark");
    });
    await page.reload();

    // Check if the html tag has 'dark' class
    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/);
  });
});
