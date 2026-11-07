import { test, expect } from "../base-test";
import { LOCALES, getStrings, reEscape } from "../i18n-strings";

for (const locale of LOCALES) {
  const s = getStrings(locale);

  test.describe(`Reset Password Flow [${locale}] - Initial State`, () => {
    test("SEO - should have correct title and description", async ({ page }) => {
      await page.goto(`/${locale}/reset-password?token=some-token`);
      await expect(page).toHaveTitle(new RegExp(reEscape(s.seo.resetPassword.title), "i"));

      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveAttribute("content", s.seo.resetPassword.description);
    });

    test("should show invalid link message if token is missing", async ({ page }) => {
      await page.goto(`/${locale}/reset-password`);

      await expect(page.getByText(s.auth.resetPassword.invalidLinkTitle).first()).toBeVisible();
      await expect(page.locator('a[href*="/login"]').first()).toBeVisible();
    });
  });

  test.describe(`Reset Password Flow [${locale}] - Valid Token State`, () => {
    test("should show validation errors on password mismatch", async ({ page }) => {
      await page.goto(`/${locale}/reset-password?token=valid-token`);

      await page.fill("input#password", "NewPass123!");
      await page.fill("input#confirmPassword", "OtherPass123!");
      await page.click('button[type="submit"]');

      await expect(
        page
          .locator("text=ne correspondent pas")
          .or(page.locator("text=do not match"))
          .or(page.locator("text=mismatch"))
          .first(),
      ).toBeVisible();
    });

    test("should successfully reset password", async ({ page }) => {
      await page.route("**/api/v1/auth/reset-password", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ message: "Password reset successful" }),
        });
      });

      await page.goto(`/${locale}/reset-password?token=valid-token`);

      // pressSequentially — webkit can drop values from bare page.fill() on
      // controlled RHF inputs.
      await page.locator("input#password").pressSequentially("NewPass123!");
      await page.locator("input#confirmPassword").pressSequentially("NewPass123!");
      await page.click('button[type="submit"]');

      await expect(page.getByText(s.auth.resetPassword.successTitle).first()).toBeVisible();
      await expect(page.locator('a[href*="/login"]').first()).toBeVisible();
    });

    test("should show error on invalid/expired token", async ({ page }) => {
      await page.route("**/api/v1/auth/reset-password", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Token expired or invalid" }),
        });
      });

      await page.goto(`/${locale}/reset-password?token=invalid-token`);

      await page.locator("input#password").pressSequentially("NewPass123!");
      await page.locator("input#confirmPassword").pressSequentially("NewPass123!");
      await page.click('button[type="submit"]');

      await expect(
        page
          .locator("text=expired")
          .or(page.locator("text=expiré").or(page.locator("text=error")))
          .first(),
      ).toBeVisible();
    });

    test("should toggle password visibility", async ({ page }) => {
      await page.goto(`/${locale}/reset-password?token=valid-token`);
      const passwordInput = page.locator("input#password");

      await expect(passwordInput).toHaveAttribute("type", "password");
      await page.locator(".ant-input-password-icon").first().click();
      await expect(passwordInput).toHaveAttribute("type", "text");
      await page.locator(".ant-input-password-icon").first().click();
      await expect(passwordInput).toHaveAttribute("type", "password");
    });
  });
}
