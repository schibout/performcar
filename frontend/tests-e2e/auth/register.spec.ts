import { test, expect } from "../base-test";
import { LOCALES, getStrings, reEscape } from "../i18n-strings";

for (const locale of LOCALES) {
  const s = getStrings(locale);

  test.describe(`Register Flow [${locale}]`, () => {
    test("SEO - should have correct title and description", async ({ page }) => {
      await page.goto(`/${locale}/register`);
      await expect(page).toHaveTitle(new RegExp(reEscape(s.seo.register.title), "i"));

      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveAttribute("content", s.seo.register.description);
    });

    test("should register successfully with valid credentials", async ({ page }) => {
      await page.route("**/api/v1/auth/register", async (route) => {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Registration successful",
            user: { id: "1", email: "test@example.com", first_name: "Test" },
          }),
        });
      });

      await page.goto(`/${locale}/register`);

      await page.locator("input#first_name").fill("John");
      await page.locator("input#last_name").fill("Doe");
      await page.locator("input#email").fill("test@example.com");
      await page.locator("input#password").fill("Password123!");
      await page.locator("input#confirmPassword").fill("Password123!");
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(new RegExp(`.*/${locale}/verify-email-notice`));
      await expect(page.getByText(s.auth.verifyEmail.noticeTitle).first()).toBeVisible();
    });

    test("should show error on existing email", async ({ page }) => {
      await page.route("**/api/v1/auth/register", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ detail: "User with this email already exists" }),
        });
      });

      await page.goto(`/${locale}/register`);

      await page.locator("input#first_name").fill("John");
      await page.locator("input#last_name").fill("Doe");
      await page.locator("input#email").fill("existing@example.com");
      await page.locator("input#password").fill("Password123!");
      await page.locator("input#confirmPassword").fill("Password123!");
      await page.click('button[type="submit"]');

      await expect(page.getByText("User with this email already exists").first()).toBeVisible();
    });

    test("should show validation errors on password mismatch", async ({ page }) => {
      await page.goto(`/${locale}/register`);

      await page.fill("input#password", "Password123!");
      await page.fill("input#confirmPassword", "WrongPass123!");
      await page.click('button[type="submit"]');

      // Validation copy — regex accepts either locale.
      await expect(
        page
          .locator("text=ne correspondent pas")
          .or(page.locator("text=do not match"))
          .or(page.locator("text=mismatch"))
          .first(),
      ).toBeVisible();
    });

    test("should toggle password visibility", async ({ page }) => {
      await page.goto(`/${locale}/register`);
      const passwordInput = page.locator("input#password");

      await expect(passwordInput).toHaveAttribute("type", "password");
      await page.locator(".ant-input-password-icon").first().click();
      await expect(passwordInput).toHaveAttribute("type", "text");
      await page.locator(".ant-input-password-icon").first().click();
      await expect(passwordInput).toHaveAttribute("type", "password");
    });
  });
}
