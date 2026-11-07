import { test, expect } from "../base-test";
import {
  adminUser,
  injectSession,
  mockAdminActivities,
  mockAdminUsersList,
  mockMe,
  regularUser,
} from "./admin-helpers";
import { LOCALES, getStrings } from "./admin-strings";

import type { Page } from "@playwright/test";

const mockStatsResponse = async (
  page: Page,
  stats: {
    users_total: number;
    users_active: number;
    users_verified: number;
    users_admins: number;
    activities_total: number;
    activities_today: number;
  },
): Promise<void> => {
  await page.route(/.*\/api\/v1\/admin\/stats$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(stats),
    });
  });
};

for (const locale of LOCALES) {
  const s = getStrings(locale).admin;

  test.describe(`Admin dashboard [${locale}]`, () => {
    test("renders stat cards with totals from the backend", async ({ page }) => {
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await mockStatsResponse(page, {
        users_total: 42,
        users_active: 37,
        users_verified: 28,
        users_admins: 3,
        activities_total: 500,
        activities_today: 119,
      });
      await mockAdminActivities(page);

      await page.goto(`/${locale}/admin/dashboard`);

      await expect(page.getByRole("heading", { name: s.dashboard.title })).toBeVisible();
      await expect(page.getByText("42", { exact: true })).toBeVisible();
      await expect(page.getByText("37", { exact: true })).toBeVisible();
      await expect(page.getByText("3", { exact: true })).toBeVisible();
      await expect(page.getByText("119", { exact: true })).toBeVisible();
      // The activity card reports today's count, not the all-time total.
      await expect(page.getByText("500", { exact: true })).toHaveCount(0);
    });

    test("quick-action buttons navigate to users and activities", async ({ page }) => {
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await mockStatsResponse(page, {
        users_total: 2,
        users_active: 2,
        users_verified: 2,
        users_admins: 1,
        activities_total: 0,
        activities_today: 0,
      });
      await mockAdminUsersList(page, [adminUser, regularUser], 2);
      await mockAdminActivities(page);

      await page.goto(`/${locale}/admin/dashboard`);

      await page.getByRole("link", { name: s.dashboard.viewAllUsers }).click();
      await expect(page).toHaveURL(new RegExp(`.*/${locale}/admin/users`));

      await page.goto(`/${locale}/admin/dashboard`);
      await page.getByRole("link", { name: s.dashboard.viewAllActivity }).click();
      await expect(page).toHaveURL(new RegExp(`.*/${locale}/admin/activities`));
    });
  });
}
