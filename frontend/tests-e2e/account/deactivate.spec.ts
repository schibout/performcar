import { type BrowserContext, type Page } from "@playwright/test";

import type { Permission } from "@/lib/types/permissions";
import { SystemRole } from "@/lib/types/user";

import { test, expect } from "../base-test";
import { LOCALES, getStrings, reEscape, type Locale } from "../i18n-strings";
import { SELF_PERMISSIONS } from "../user-fixtures";

/**
 * Covers the self-deactivation grace-period flow end-to-end:
 *   1. Authenticated user opens the Danger Zone → submits the dialog → API
 *      clears the session cookie and frontend routes back to /login.
 *   2. User logs back in during the grace window → the login response returns
 *      a `deletion_scheduled_at`, which the auth flow honours by landing them
 *      on /account-deactivated instead of /dashboard.
 *   3. From /account-deactivated, clicking "reactivate" calls the reactivate
 *      endpoint and the user is routed back to the dashboard.
 */

interface MockUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: SystemRole;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  title: string | null;
  deactivated_at: string | null;
  deletion_scheduled_at: string | null;
  permissions: Permission[];
}

const baseUser: MockUser = {
  id: "user-1",
  email: "jane@example.com",
  first_name: "Jane",
  last_name: "Doe",
  role: SystemRole.USER,
  is_active: true,
  is_verified: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  title: null,
  deactivated_at: null,
  deletion_scheduled_at: null,
  permissions: SELF_PERMISSIONS,
};

const seedAuthedSession = async (context: BrowserContext, user: MockUser, locale: Locale) => {
  await context.addCookies([
    { name: "access_token", value: "fake-jwt", domain: "127.0.0.1", path: "/" },
    { name: "NEXT_LOCALE", value: locale, domain: "127.0.0.1", path: "/" },
  ]);
  await context.addInitScript(
    (storageData: string) => {
      window.localStorage.setItem("auth-storage", storageData);
    },
    JSON.stringify({
      state: { user, isAuthenticated: true, isSessionInitialized: true },
      version: 0,
    }),
  );
};

const stubMe = async (page: Page, getUser: () => MockUser) => {
  await page.route("**/api/v1/users/me", async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(getUser()),
    });
  });
};

// Next dev compiles a route on the first request that hits it; give the
// landing navigation enough headroom so the Suspense loading.tsx has time
// to resolve before we start asserting on page content.
test.describe.configure({ timeout: 90_000 });

for (const locale of LOCALES) {
  const s = getStrings(locale);

  test.describe(`Account deactivation flow [${locale}]`, () => {
    test("deactivates from the Danger Zone and redirects to login", async ({ page, context }) => {
      let currentUser: MockUser = { ...baseUser };

      await stubMe(page, () => currentUser);

      await page.route("**/api/v1/users/me", async (route) => {
        if (route.request().method() !== "DELETE") return route.fallback();

        const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        currentUser = {
          ...currentUser,
          is_active: false,
          deactivated_at: new Date().toISOString(),
          deletion_scheduled_at: future,
        };
        await context.clearCookies({ name: "access_token" });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "success.account.deactivated",
            deletion_scheduled_at: future,
          }),
        });
      });

      await seedAuthedSession(context, currentUser, locale);
      await page.goto(`/${locale}/profile`);

      const securityTab = page.getByRole("tab", { name: s.profile.tabs.security });
      await securityTab.waitFor({ state: "visible", timeout: 60_000 });
      await securityTab.click();

      await page.getByRole("button", { name: s.account.deactivate.cta }).click();

      await page.getByLabel(s.account.deactivate.dialog.passwordLabel).fill("Password123!");
      await page.getByText(s.account.deactivate.dialog.acknowledgeLabel).click();

      await page
        .getByRole("button", {
          name: new RegExp(`^${reEscape(s.account.deactivate.dialog.confirm)}$`),
        })
        .click();

      await expect(page).toHaveURL(new RegExp(`.*/${locale}/login`));
    });

    test("re-logging in during grace period lands on /account-deactivated", async ({ page }) => {
      const future = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString();
      const deactivatedUser: MockUser = {
        ...baseUser,
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deletion_scheduled_at: future,
      };

      await page.route("**/api/v1/auth/login", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: {
            "Set-Cookie": "access_token=fake-jwt-token; Path=/; HttpOnly; SameSite=Lax",
          },
          body: JSON.stringify({
            token_type: "bearer",
            user: deactivatedUser,
            message: "success.auth.login",
          }),
        });
      });

      // /me returns 401 on /login so AuthHydrator treats us as logged out. Only
      // after the login mutation fires does the user become known and
      // useLoginMutation.onSuccess inspects deletion_scheduled_at to route us.
      await page.route("**/api/v1/users/me", async (route) => {
        if (route.request().method() !== "GET") return route.fallback();
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Not authenticated" }),
        });
      });

      await page.goto(`/${locale}/login`);
      const emailInput = page.locator("input#email");
      await emailInput.waitFor({ state: "visible", timeout: 60_000 });
      await emailInput.pressSequentially("jane@example.com");
      await page.locator("input#password").pressSequentially("Password123!");
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(new RegExp(`.*/${locale}/account-deactivated`));

      // daysRemaining and scheduledAt use {{count}} / {{date}} placeholders.
      // Assert on stable fragments that survive interpolation and don't leak
      // between the two keys in either locale.
      const daysText = locale === "fr" ? /avant la suppression/i : /permanent deletion/i;
      const dateText = locale === "fr" ? /suppression programm/i : /deletion scheduled/i;
      await expect(page.getByText(daysText).first()).toBeVisible();
      await expect(page.getByText(dateText).first()).toBeVisible();
    });

    test("reactivate from deactivated page routes back to the dashboard", async ({
      page,
      context,
    }) => {
      const future = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
      let currentUser: MockUser = {
        ...baseUser,
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deletion_scheduled_at: future,
      };

      await stubMe(page, () => currentUser);

      await page.route("**/api/v1/users/me/reactivate", async (route) => {
        currentUser = {
          ...currentUser,
          is_active: true,
          deactivated_at: null,
          deletion_scheduled_at: null,
        };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "success.account.reactivated",
          }),
        });
      });

      // Dashboard shell probes the users list; keep it happy so the landing
      // page renders without tripping the global 401 interceptor.
      await page.route("**/api/v1/users", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([currentUser]),
        });
      });

      await seedAuthedSession(context, currentUser, locale);
      await page.goto(`/${locale}/account-deactivated`);

      await expect(page).toHaveURL(new RegExp(`.*/${locale}/account-deactivated`));

      const reactivateButton = page.getByRole("button", { name: s.account.deactivated.reactivate });
      await reactivateButton.waitFor({ state: "visible", timeout: 60_000 });
      await reactivateButton.click();

      await expect(page).toHaveURL(new RegExp(`.*/${locale}/dashboard`));
    });
  });
}
