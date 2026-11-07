import { test, expect } from "../base-test";
import { LOCALES, getStrings } from "../i18n-strings";

for (const locale of LOCALES) {
  const s = getStrings(locale);

  test.describe(`Verify Email Notice Flow [${locale}]`, () => {
    test("should display notice and handle resend when a pending email is stored", async ({
      page,
    }) => {
      const testEmail = "test@example.com";
      await page.addInitScript((email) => {
        window.sessionStorage.setItem("pendingVerifyEmail", email);
      }, testEmail);
      await page.goto(`/${locale}/verify-email-notice`);

      // URL must stay clean — no email leaks into Referer/logs/analytics.
      await expect(page).toHaveURL(new RegExp(`.*/${locale}/verify-email-notice$`));
      await expect(page.locator("input#email")).toHaveValue(testEmail);

      await expect(page.getByRole("link", { name: s.auth.verifyEmail.backToLogin })).toBeVisible();

      await page.route("**/api/v1/auth/resend-verification*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ message: "Verification email resent" }),
        });
      });

      await page.getByRole("button", { name: s.auth.verifyEmail.resendButton }).click();

      await expect(page.getByText(s.auth.verifyEmail.resendSuccess).first()).toBeVisible();
    });

    test("redirects to login when no pending email is stored", async ({ page }) => {
      await page.goto(`/${locale}/verify-email-notice`);
      await expect(page).toHaveURL(new RegExp(`.*/${locale}/login(\\?.*)?$`));
    });
  });
}
