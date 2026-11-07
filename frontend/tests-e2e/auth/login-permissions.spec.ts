import { regularUser } from "../admin/admin-helpers";
import { test, expect } from "../base-test";
import { LOCALES, getStrings, reEscape } from "../i18n-strings";

for (const locale of LOCALES) {
  const s = getStrings(locale);

  test.describe(`Permissions after login [${locale}]`, () => {
    // /users/me stays on the catch-all 401 of base-test: the permissions can only
    // come from the login response, as they do in a real session.
    test("the form login opens the permission gates with no reload", async ({ page }) => {
      await page.route("**/api/v1/auth/login", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: {
            "Set-Cookie": "access_token=fake-jwt-token; Path=/; HttpOnly; SameSite=Lax",
          },
          body: JSON.stringify({
            token_type: "bearer",
            user: regularUser,
            message: "success.auth.login",
          }),
        });
      });

      const anonymousHydration = page.waitForResponse("**/api/v1/users/me");
      await page.goto(`/${locale}/login`);
      await anonymousHydration;

      const documentRequests: string[] = [];
      page.on("request", (request) => {
        if (request.isNavigationRequest()) documentRequests.push(request.url());
      });

      await page.locator("input#email").pressSequentially(regularUser.email);
      await page.locator("input#password").pressSequentially("Password123!");
      await page.click('button[type="submit"]');
      await page.waitForURL(new RegExp(`.*/${locale}/dashboard`));

      await expect(page.getByRole("button", { name: s.notifications.bell })).toBeVisible();
      await page.getByRole("button", { name: s.common.ui.userMenu }).click();
      await expect(
        page
          .getByRole("menuitem", { name: new RegExp(reEscape(s.common.nav.support), "i") })
          .first(),
      ).toBeVisible();
      expect(documentRequests).toEqual([]);
    });
  });
}
