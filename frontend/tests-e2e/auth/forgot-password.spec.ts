import { test, expect } from "../base-test";
import { LOCALES, getStrings, reEscape } from "../i18n-strings";

for (const locale of LOCALES) {
  const s = getStrings(locale);

  test.describe(`Forgot Password Flow [${locale}]`, () => {
    test("SEO - should have correct title and description", async ({ page }) => {
      await page.goto(`/${locale}/forgot-password`);
      await expect(page).toHaveTitle(new RegExp(reEscape(s.seo.forgotPassword.title), "i"));

      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveAttribute("content", s.seo.forgotPassword.description);
    });

    test("should show error on non-existent account email", async ({ page }) => {
      await page.route("**/api/v1/auth/forgot-password", async (route) => {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ detail: "User with this email not found" }),
        });
      });

      await page.goto(`/${locale}/forgot-password`);

      // pressSequentially — webkit can drop values assigned via page.fill()
      // on controlled RHF inputs.
      await page.locator("input#email").pressSequentially("nonexistent@example.com");
      await page.click('button[type="submit"]');

      await expect(page.getByText("User with this email not found").first()).toBeVisible();
    });

    test("should successfully request password reset link", async ({ page }) => {
      await page.route("**/api/v1/auth/forgot-password", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ message: "Password reset link sent successfully" }),
        });
      });

      await page.goto(`/${locale}/forgot-password`);

      await page.locator("input#email").pressSequentially("valid@example.com");
      await page.click('button[type="submit"]');

      await expect(page.getByText(s.auth.forgotPassword.successTitle).first()).toBeVisible();
    });

    test("should show validation errors on invalid email", async ({ page }) => {
      await page.goto(`/${locale}/forgot-password`);
      await page.locator("input#email").pressSequentially("invalid-email");
      await page.click('button[type="submit"]');

      // Validation copy — one locale matches per iteration.
      await expect(
        page
          .locator("text=adresse e-mail valide")
          .or(page.locator("text=Invalid email"))
          .or(page.locator("text=valid email"))
          .first(),
      ).toBeVisible();
    });
  });
}
