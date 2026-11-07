import { test, expect } from "../base-test";
import { LOCALES, getStrings, reEscape, type Locale } from "../i18n-strings";
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
    { name: "access_token", value: "fake-jwt-token", domain: "127.0.0.1", path: "/" },
    { name: "NEXT_LOCALE", value: locale, domain: "127.0.0.1", path: "/" },
  ]);

  await page.addInitScript(
    (storageData) => {
      window.localStorage.setItem("auth-storage", storageData);
    },
    JSON.stringify({ state: { user: mockUser, isAuthenticated: true }, version: 0 }),
  );
};

for (const locale of LOCALES) {
  const s = getStrings(locale);

  test.describe(`Dashboard Page [${locale}]`, () => {
    test("SEO - should have correct title and description", async ({ page }) => {
      await setupAuthenticatedState(page, locale);
      await page.goto(`/${locale}/dashboard`);

      await expect(page).toHaveTitle(new RegExp(reEscape(s.seo.dashboard.title), "i"));
      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveAttribute("content", s.seo.dashboard.description);
    });

    test("should display welcome message and user info", async ({ page }) => {
      await setupAuthenticatedState(page, locale);
      await page.goto(`/${locale}/dashboard`);

      await expect(page.getByText(s.dashboard.welcome).first()).toBeVisible();
      await expect(page.getByText(s.dashboard.userInfo).first()).toBeVisible();
      await expect(page.getByText("John").first()).toBeVisible();
      await expect(page.getByText("john@example.com").first()).toBeVisible();
    });

    test("should show loading skeletons", async ({ page }) => {
      await page.route("**/api/v1/users/me", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "1", first_name: "John", permissions: SELF_PERMISSIONS }),
        });
      });

      await page
        .context()
        .addCookies([{ name: "access_token", value: "fake-jwt", url: "http://127.0.0.1:3000" }]);

      await page.goto(`/${locale}/dashboard`);
      await expect(page.locator(".animate-pulse").first()).toBeVisible();
    });

    test("should have functional navigation from dashboard to profile", async ({ page }) => {
      await setupAuthenticatedState(page, locale);
      await page.goto(`/${locale}/dashboard`);

      const profileBtn = page
        .getByRole("button", { name: "john@example.com" })
        .or(page.locator('button:has-text("J")'))
        .or(page.getByRole("button", { name: new RegExp(reEscape(s.common.ui.toggleMenu), "i") }))
        .first();
      await profileBtn.click();

      await page.getByText(s.common.nav.profile, { exact: true }).first().click();
      await expect(page).toHaveURL(new RegExp(`.*/${locale}/profile`));
    });
  });
}
