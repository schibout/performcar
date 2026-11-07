import { test, expect } from "../base-test";
import { LOCALES, getStrings, reEscape, type Locale } from "../i18n-strings";
import { SELF_PERMISSIONS } from "../user-fixtures";

import type { Page } from "@playwright/test";

const setupAuthenticatedState = async (page: Page, locale: Locale) => {
  const mockUser = {
    id: "1",
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
    JSON.stringify({
      state: { user: mockUser, isAuthenticated: true },
      version: 0,
    }),
  );
};

for (const locale of LOCALES) {
  const s = getStrings(locale);

  test.describe(`Header - Mobile Viewport [${locale}]`, () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test.beforeEach(async ({ page }) => {
      await page.route("**/api/v1/users/me", async (route) => {
        await route.fulfill({ status: 401 });
      });
    });

    test("should show the hamburger menu button and open drawer", async ({ page }) => {
      await page.goto(`/${locale}`);
      const hamburgerBtn = page
        .getByRole("button", { name: new RegExp(reEscape(s.common.ui.toggleMenu), "i") })
        .first();
      await expect(hamburgerBtn).toBeVisible();

      await hamburgerBtn.click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    });

    test("should show Login and Register buttons in drawer when unauthenticated", async ({
      page,
    }) => {
      await page.goto(`/${locale}`);
      await page
        .getByRole("button", { name: new RegExp(reEscape(s.common.ui.toggleMenu), "i") })
        .first()
        .click();

      // The mobile AppDrawer still uses onClick-navigation <Button>s (unlike
      // the desktop AuthButtons which were promoted to asChild + <Link>).
      await expect(
        page.getByRole("button", { name: s.auth.login.submitButton }).first(),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: s.auth.register.submitButton }).first(),
      ).toBeVisible();
    });

    test("should show user info in drawer when authenticated", async ({ page }) => {
      await setupAuthenticatedState(page, locale);
      await page.goto(`/${locale}`);
      await page
        .getByRole("button", { name: new RegExp(reEscape(s.common.ui.toggleMenu), "i") })
        .first()
        .click();

      await expect(page.getByText("John Doe").first()).toBeVisible();
      await expect(
        page.getByRole("button", { name: s.auth.logout.logoutButton }).first(),
      ).toBeVisible();
    });
  });

  test.describe(`Header - Desktop Viewport [${locale}]`, () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test.beforeEach(async ({ page }) => {
      await page.route("**/api/v1/users/me", async (route) => {
        await route.fulfill({ status: 401 });
      });
    });

    test("should show Login and Register buttons when unauthenticated", async ({ page }) => {
      await page.goto(`/${locale}`);
      // AuthButtons now renders link-wrapped shadcn buttons for the unauth CTAs
      // so cmd/ctrl-click opens in a new tab. The accessibility role is "link".
      await expect(
        page.getByRole("link", { name: s.auth.login.submitButton }).first(),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: s.auth.register.submitButton }).first(),
      ).toBeVisible();
    });

    test("should show user avatar and dropdown when authenticated", async ({ page }) => {
      await setupAuthenticatedState(page, locale);
      await page.goto(`/${locale}`);

      await expect(
        page.getByRole("banner").getByRole("link", { name: s.auth.login.submitButton }),
      ).not.toBeVisible();

      // The control capsule's theme/language buttons are also rounded-full,
      // so target the avatar trigger by its accessible name.
      const avatarBtn = page.getByRole("button", { name: s.common.ui.userMenu });
      await expect(avatarBtn).toBeVisible();

      await avatarBtn.click();
      await expect(page.getByText("John Doe").first()).toBeVisible();
      await expect(
        page
          .getByRole("menuitem", { name: new RegExp(reEscape(s.common.nav.profile), "i") })
          .first(),
      ).toBeVisible();
      // Desktop parity with the mobile drawer: Support is reachable from here.
      await expect(
        page
          .getByRole("menuitem", { name: new RegExp(reEscape(s.common.nav.support), "i") })
          .first(),
      ).toBeVisible();
    });

    test("should toggle theme via header", async ({ page }) => {
      await page.goto(`/${locale}`);
      const themeBtn = page
        .getByRole("button", { name: new RegExp(reEscape(s.common.ui.toggleTheme), "i") })
        .first();
      await expect(themeBtn).toBeVisible();

      await themeBtn.click();

      const getTheme = () => page.evaluate(() => localStorage.getItem("theme"));
      await expect.poll(getTheme, { timeout: 3000 }).not.toBeNull();
    });
  });
}

// Language-switch test doesn't fit the per-locale loop — it asserts the
// transition between locales.
test.describe("Header - Language switch", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await page.route("**/api/v1/users/me", async (route) => {
      await route.fulfill({ status: 401 });
    });
  });

  test("should switch language between FR and EN", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/.*\/fr/);

    await page
      .getByRole("button", { name: /Toggle Menu|Afficher\/masquer le menu/i })
      .first()
      .click();

    const targetLangBtn = page
      .getByRole("button", { name: /Toggle Language|Changer de langue|English|Language|Langue/i })
      .first();
    await expect(targetLangBtn).toBeVisible();

    await targetLangBtn.scrollIntoViewIfNeeded();
    await targetLangBtn.click({ force: true });

    await expect(page).toHaveURL(/.*\/en/, { timeout: 15000 });
  });
});
