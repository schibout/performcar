import type { AdminUser } from "@/lib/types/admin";

import { test, expect } from "../base-test";
import { adminUser, injectSession, mockMe, regularUser } from "./admin-helpers";
import { LOCALES, getStrings } from "./admin-strings";

const suspendedUser: AdminUser = {
  ...regularUser,
  id: "suspended-1",
  email: "suspended@test.com",
  is_active: false,
  suspended_at: "2026-04-20T10:00:00Z",
};

for (const locale of LOCALES) {
  const s = getStrings(locale).account;
  const adminStrings = getStrings(locale).admin;

  test.describe(`Suspended user session [${locale}]`, () => {
    test("hydrator routes a suspended user from the dashboard to /account-suspended", async ({
      page,
    }) => {
      await injectSession(page, suspendedUser, locale);
      await mockMe(page, suspendedUser);

      await page.goto(`/${locale}/dashboard`);

      await expect(page).toHaveURL(new RegExp(`.*/${locale}/account-suspended$`));
      await expect(page.getByTestId("account-suspended-card")).toBeVisible();
      await expect(page.getByText(s.suspended.title)).toBeVisible();
      // Suspended landing never exposes a reactivate affordance — logout only.
      await expect(page.getByTestId("account-suspended-logout")).toBeVisible();
      await expect(page.getByRole("button", { name: s.deactivated.reactivate })).not.toBeVisible();
      // The global header (with avatar dropdown / dashboard / profile links)
      // must be hidden so a suspended user has no escape hatch back into the
      // app from the chrome.
      await expect(page.locator("header")).toHaveCount(0);
    });

    test("a non-suspended user visiting /account-suspended is sent to the dashboard", async ({
      page,
    }) => {
      // A regular (non-admin) user: lands on the user dashboard without the
      // admin-area redirect that would otherwise bounce an admin to /admin.
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);

      await page.goto(`/${locale}/account-suspended`);

      await expect(page).toHaveURL(new RegExp(`.*/${locale}/dashboard$`));
    });

    test("admin list shows the suspended status badge for a suspended row", async ({ page }) => {
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await page.route(/.*\/api\/v1\/admin\/users(\?.*)?$/, async (route) => {
        if (route.request().method() !== "GET") {
          await route.fallback();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: [suspendedUser], total: 1, skip: 0, limit: 25 }),
        });
      });

      await page.goto(`/${locale}/admin/users`);

      await expect(
        page.getByText(adminStrings.users.status.suspended, { exact: true }),
      ).toBeVisible();
    });
  });
}
