import { test, expect } from "../base-test";
import { LOCALES, getStrings, type Locale } from "../i18n-strings";
import { SELF_PERMISSIONS } from "../user-fixtures";

import type { Page } from "@playwright/test";

const setupAuthenticatedState = async (page: Page, locale: Locale) => {
  const mockUser = {
    id: "user-123",
    email: "john@example.com",
    first_name: "John",
    last_name: "Doe",
    permissions: SELF_PERMISSIONS,
  };

  await page.route("**/api/v1/users/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockUser),
    });
  });

  await page.context().addCookies([
    { name: "access_token", value: "fake-jwt", domain: "127.0.0.1", path: "/" },
    { name: "NEXT_LOCALE", value: locale, domain: "127.0.0.1", path: "/" },
  ]);

  // Set auth-storage after navigation to avoid persistent init script issues.
  await page.evaluate(
    (storageData) => {
      window.localStorage.setItem("auth-storage", storageData);
    },
    JSON.stringify({ state: { user: mockUser, isAuthenticated: true }, version: 0 }),
  );
};

for (const locale of LOCALES) {
  const s = getStrings(locale);

  test.describe(`Logout Flow [${locale}]`, () => {
    test("should successfully logout from desktop dropdown", async ({ page }) => {
      await page.route("**/api/v1/auth/logout", async (route) => {
        await page.context().clearCookies({ name: "access_token" });

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ message: "Logged out successfully" }),
        });
      });

      await page.goto(`/${locale}/dashboard`);
      await setupAuthenticatedState(page, locale);
      await page.reload();

      const avatar = page
        .getByRole("button", { name: "john@example.com" })
        .or(page.locator('button:has-text("J")'))
        .first();
      await avatar.click();

      await page.getByRole("menuitem", { name: s.auth.logout.logoutButton }).click();

      await expect(page).toHaveURL(new RegExp(`.*/${locale}(/login)?$`));

      await page.route("**/api/v1/users/me", async (route) => {
        await route.fulfill({
          status: 401,
          body: JSON.stringify({ detail: "Not authenticated" }),
        });
      });
      await page.goto(`/${locale}/dashboard`).catch(() => {
        // middleware-side redirect can race with goto — ignore
      });
      await expect(page).toHaveURL(new RegExp(`.*/${locale}/login`));
    });

    test("should successfully logout from mobile drawer", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.route("**/api/v1/auth/logout", async (route) => {
        await page.context().clearCookies({ name: "access_token" });

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ message: "Logged out successfully" }),
        });
      });

      await page.goto(`/${locale}/dashboard`);
      await setupAuthenticatedState(page, locale);
      await page.reload();

      await page.getByRole("button", { name: /Menu/i }).click();

      await page.getByText(s.auth.logout.logoutButton).click();

      await expect(page).toHaveURL(new RegExp(`.*/${locale}(/login)?$`));
    });
  });
}
