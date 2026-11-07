import { test, expect } from "../base-test";
import { LOCALES, getStrings, reEscape } from "../i18n-strings";

for (const locale of LOCALES) {
  const s = getStrings(locale);

  test.describe(`Verify Email [${locale}]`, () => {
    test("SEO - should have correct title and description", async ({ page }) => {
      await page.goto(`/${locale}/verify-email?token=some-token`);
      await expect(page).toHaveTitle(new RegExp(reEscape(s.seo.verifyEmail.title), "i"));

      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveAttribute("content", s.seo.verifyEmail.description);
    });

    test("should display verifying state initially", async ({ page }) => {
      // Delay the mock response so the "verifying" UI stays on screen long
      // enough for the assertion — without a delay the success state can
      // paint before Playwright queries the DOM, producing a flaky miss.
      await page.route("**/api/v1/auth/verify-email*", async (route) => {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 1_500);
        });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ message: "Verified" }),
        });
      });

      await page.goto(`/${locale}/verify-email?token=valid-token`);
      await expect(page.getByText(s.auth.verifyEmail.verifying).first()).toBeVisible();
    });

    test("should show success state on valid token", async ({ page }) => {
      await page.route("**/api/v1/auth/verify-email*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ message: "Verification successful" }),
        });
      });

      await page.goto(`/${locale}/verify-email?token=valid-token`);

      await expect(page.getByText(s.auth.verifyEmail.successTitle).first()).toBeVisible();
      await expect(page.locator('a[href*="/login"]').first()).toBeVisible();
    });

    test("should show error on invalid token", async ({ page }) => {
      await page.route("**/api/v1/auth/verify-email*", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Token expired or invalid" }),
        });
      });

      await page.goto(`/${locale}/verify-email?token=invalid-token`);

      await expect(page.getByText(s.auth.verifyEmail.failedTitle).first()).toBeVisible();
    });
  });
}
