import { test, expect } from "../base-test";
import {
  adminUser,
  injectSession,
  mockAdminActivities,
  mockAdminUserDetail,
  mockAdminUsersList,
  mockMe,
  regularUser,
} from "./admin-helpers";
import { LOCALES, getStrings } from "./admin-strings";

for (const locale of LOCALES) {
  const s = getStrings(locale).admin;

  test.describe(`Admin users list [${locale}]`, () => {
    test("renders users returned by the backend", async ({ page }) => {
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await mockAdminUsersList(page, [adminUser, regularUser], 2);
      await mockAdminActivities(page);

      await page.goto(`/${locale}/admin/users`);
      await expect(page).toHaveURL(new RegExp(`.*/${locale}/admin/users`));
      await expect(page.getByRole("heading", { name: s.users.title })).toBeVisible();
      await expect(page.getByText("admin@test.com").first()).toBeVisible();
      await expect(page.getByText("user@test.com").first()).toBeVisible();
    });

    test("empty state appears when the server returns no rows", async ({ page }) => {
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await mockAdminUsersList(page, [], 0);
      await mockAdminActivities(page);

      await page.goto(`/${locale}/admin/users`);
      await expect(page.getByText(s.users.empty).first()).toBeVisible();
    });

    test("row click opens the user detail page", async ({ page }) => {
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await mockAdminUsersList(page, [regularUser], 1);
      await mockAdminUserDetail(page, regularUser);
      await mockAdminActivities(page);

      await page.goto(`/${locale}/admin/users`);
      await page.getByText("user@test.com").first().click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/admin/users/${regularUser.id}`));
      await expect(page.getByRole("heading", { name: /Usain User/ })).toBeVisible();
    });
  });

  test.describe(`Admin user detail [${locale}]`, () => {
    test("shows the form populated with server data", async ({ page }) => {
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await mockAdminUserDetail(page, regularUser);
      await mockAdminActivities(page);

      await page.goto(`/${locale}/admin/users/${regularUser.id}`);
      await expect(page.locator("input#first_name")).toHaveValue("Usain");
      await expect(page.locator("input#last_name")).toHaveValue("User");
      // Email is intentionally not editable by admins (see UserEditFormFields)
      // — assert it surfaces read-only via the overview card instead.
      await expect(page.getByText("user@test.com").first()).toBeVisible();
    });
  });
}
