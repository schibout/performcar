import { test, expect } from "../base-test";
import {
  adminUser,
  injectSession,
  mockAdminActivities,
  mockAdminUserDetail,
  mockMe,
  regularUser,
} from "./admin-helpers";
import { LOCALES, getStrings } from "./admin-strings";

import type { Page } from "@playwright/test";

const suspendedUser = {
  ...regularUser,
  id: "user-2",
  email: "pause@test.com",
  is_active: false,
  suspended_at: "2026-04-20T10:00:00Z",
};

const mockAdminUserAction = async (
  page: Page,
  urlPattern: RegExp,
  method: string,
  status = 200,
): Promise<{ calls: number }> => {
  const state = { calls: 0 };
  await page.route(urlPattern, async (route) => {
    if (route.request().method() !== method) {
      // fallback() lets a previously registered handler (e.g. mockAdminUserDetail)
      // serve the request. continue() would forward to the real network — the
      // base-test global interceptor doesn't see the fall-through either.
      await route.fallback();
      return;
    }
    state.calls += 1;
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ success: true, message: "ok" }),
    });
  });
  return state;
};

for (const locale of LOCALES) {
  const s = getStrings(locale).admin;

  test.describe(`Admin user actions [${locale}]`, () => {
    test("edit form submits PATCH /admin/users/:id with the changed payload", async ({ page }) => {
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await mockAdminUserDetail(page, regularUser);
      await mockAdminActivities(page);

      let capturedBody: string | null = null;
      await page.route(new RegExp(`.*/api/v1/admin/users/${regularUser.id}$`), async (route) => {
        if (route.request().method() !== "PATCH") {
          await route.fallback();
          return;
        }
        capturedBody = route.request().postData();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ user: { ...regularUser, first_name: "Renamed" }, message: "ok" }),
        });
      });

      await page.goto(`/${locale}/admin/users/${regularUser.id}`);
      await page.locator("input#first_name").fill("Renamed");
      await page.getByRole("button", { name: s.userDetail.save }).click();

      await expect.poll(() => capturedBody).toContain('"first_name":"Renamed"');
    });

    test("suspend opens confirm and hits /suspend on confirm", async ({ page }) => {
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await mockAdminUserDetail(page, regularUser);
      await mockAdminActivities(page);
      const suspend = await mockAdminUserAction(
        page,
        new RegExp(`.*/api/v1/admin/users/${regularUser.id}/suspend$`),
        "POST",
      );

      await page.goto(`/${locale}/admin/users/${regularUser.id}`);
      await page.getByRole("button", { name: s.userDetail.suspend }).click();
      await expect(
        page.locator(".ant-modal-title", { hasText: s.confirm.suspendTitle }),
      ).toBeVisible();
      await page
        .locator(".ant-modal-footer")
        .getByRole("button", { name: s.confirm.suspendConfirm, exact: true })
        .click();

      await expect.poll(() => suspend.calls).toBeGreaterThan(0);
    });

    test("unsuspend button is rendered for suspended users and hits /unsuspend", async ({
      page,
    }) => {
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await mockAdminUserDetail(page, suspendedUser);
      await mockAdminActivities(page);
      const unsuspend = await mockAdminUserAction(
        page,
        new RegExp(`.*/api/v1/admin/users/${suspendedUser.id}/unsuspend$`),
        "POST",
      );

      await page.goto(`/${locale}/admin/users/${suspendedUser.id}`);
      await page.getByRole("button", { name: s.userDetail.unsuspend }).click();
      await page
        .locator(".ant-modal-footer")
        .getByRole("button", { name: s.confirm.unsuspendConfirm, exact: true })
        .click();

      await expect.poll(() => unsuspend.calls).toBeGreaterThan(0);
    });

    test("change-password confirm hits /change-password", async ({ page }) => {
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await mockAdminUserDetail(page, regularUser);
      await mockAdminActivities(page);
      const changePassword = await mockAdminUserAction(
        page,
        new RegExp(`.*/api/v1/admin/users/${regularUser.id}/change-password(\\?.*)?$`),
        "POST",
      );

      await page.goto(`/${locale}/admin/users/${regularUser.id}`);
      await page
        .getByTestId("admin-user-danger-zone")
        .getByRole("button", { name: s.userDetail.changePassword })
        .click();
      await page
        .locator(".ant-modal-footer")
        .getByRole("button", { name: s.confirm.changePasswordConfirm })
        .click();

      await expect.poll(() => changePassword.calls).toBeGreaterThan(0);
    });

    test("delete confirm hits DELETE and redirects back to users", async ({ page }) => {
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await mockAdminUserDetail(page, regularUser);
      await mockAdminActivities(page);

      const state = { calls: 0 };
      await page.route(new RegExp(`.*/api/v1/admin/users/${regularUser.id}$`), async (route) => {
        if (route.request().method() !== "DELETE") {
          await route.fallback();
          return;
        }
        state.calls += 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, message: "ok" }),
        });
      });
      await page.route(/.*\/api\/v1\/admin\/users(\?.*)?$/, async (route) => {
        if (route.request().method() !== "GET") {
          await route.fallback();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: [], total: 0, skip: 0, limit: 25 }),
        });
      });

      await page.goto(`/${locale}/admin/users/${regularUser.id}`);
      await page
        .getByTestId("admin-user-danger-zone")
        .getByRole("button", { name: s.userDetail.delete })
        .click();
      await page
        .locator(".ant-modal-footer")
        .getByRole("button", { name: s.confirm.deleteConfirm })
        .click();

      await expect.poll(() => state.calls).toBeGreaterThan(0);
      await expect(page).toHaveURL(new RegExp(`.*/${locale}/admin/users(\\?.*)?$`));
    });

    test("self-targeted destructive buttons are disabled", async ({ page }) => {
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await mockAdminUserDetail(page, adminUser);
      await mockAdminActivities(page);

      await page.goto(`/${locale}/admin/users/${adminUser.id}`);
      await expect(page.getByRole("button", { name: s.userDetail.suspend })).toBeDisabled();
      await expect(page.getByRole("button", { name: s.userDetail.delete })).toBeDisabled();
    });
  });
}
