import { test, expect } from "../base-test";
import { LOCALES, getStrings, reEscape, type Locale } from "../i18n-strings";
import { SELF_PERMISSIONS } from "../user-fixtures";

import type { Page } from "@playwright/test";

const mockUser = {
  id: "user-123",
  email: "john@example.com",
  first_name: "John",
  last_name: "Doe",
  permissions: SELF_PERMISSIONS,
};

const setupAuthenticatedState = async (page: Page, locale: Locale) => {
  await page.route(/.*\/api\/v1\/users\/me.*/, async (route) => {
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

  test.describe(`Profile Page [${locale}]`, () => {
    test("SEO - should have correct title and description", async ({ page }) => {
      await setupAuthenticatedState(page, locale);
      await page.goto(`/${locale}/profile`);

      await expect(page).toHaveTitle(new RegExp(reEscape(s.seo.profile.title), "i"));
      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveAttribute("content", s.seo.profile.description);
    });

    test("should display profile information correctly", async ({ page }) => {
      await setupAuthenticatedState(page, locale);
      await page.goto(`/${locale}/profile`);

      // Default view is read mode: values render as info rows, not inputs.
      await expect(page.getByText("John", { exact: true })).toBeVisible();
      await expect(page.getByText("Doe", { exact: true })).toBeVisible();
      // Email shows in both the identity band and the email info row.
      await expect(page.getByText("john@example.com").first()).toBeVisible();
    });

    test("should toggle edit mode and show save/cancel buttons", async ({ page }) => {
      await setupAuthenticatedState(page, locale);
      await page.goto(`/${locale}/profile`);

      // Read mode renders no editable inputs until Edit is clicked.
      await expect(page.getByText("John", { exact: true })).toBeVisible();
      await expect(page.locator("input#first_name")).toHaveCount(0);

      await page.getByRole("button", { name: s.common.buttons.edit }).click();

      await expect(page.locator("input#first_name")).toBeEnabled();
      await expect(page.getByRole("button", { name: s.common.buttons.save })).toBeVisible();
      await expect(page.getByRole("button", { name: s.common.buttons.cancel })).toBeVisible();
    });

    test("should switch between tabs", async ({ page }) => {
      await setupAuthenticatedState(page, locale);
      await page.goto(`/${locale}/profile`);

      await page.getByRole("tab", { name: s.profile.tabs.security }).click();

      await expect(page.getByText(s.profile.security.currentPassword).first()).toBeVisible();
      await expect(page.locator("input#current_password")).toBeVisible();
    });

    test("should update profile successfully", async ({ page }) => {
      await setupAuthenticatedState(page, locale);

      await page.route(/.*\/api\/v1\/users\/me.*/, async (route) => {
        const method = route.request().method();
        if (method === "PATCH" || method === "PUT") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              // PATCH /users/me answers with the same payload as GET /users/me.
              user: { ...mockUser, first_name: "Johnny" },
              message: "success.user.updated",
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(mockUser),
          });
        }
      });

      await page.goto(`/${locale}/profile`);
      await page.getByRole("button", { name: s.common.buttons.edit }).click();
      await page.fill("input#first_name", "Johnny");
      await page.getByRole("button", { name: s.profile.info.submit }).click();

      // Success toast uses the translated success message — regex accepts either.
      await expect(
        page
          .locator("text=mis à jour")
          .or(page.locator("text=updated successfully"))
          .first(),
      ).toBeVisible();
      // A successful save flips the form back to read mode.
      await expect(page.getByText("Johnny", { exact: true }).first()).toBeVisible();
      await expect(page.locator("input#first_name")).toHaveCount(0);
    });

    test("should show validation errors on profile info form", async ({ page }) => {
      await setupAuthenticatedState(page, locale);
      await page.goto(`/${locale}/profile`);

      await page.getByRole("button", { name: s.common.buttons.edit }).click();
      await page.fill("input#first_name", "a");
      await page.getByRole("button", { name: s.profile.info.submit }).click();

      await expect(
        page.locator("text=au moins 2").or(page.locator("text=at least 2")).first(),
      ).toBeVisible();
    });

    test("should successfully change password in security tab", async ({ page }) => {
      await setupAuthenticatedState(page, locale);

      await page.route(/.*\/api\/v1\/auth\/change-password.*/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ message: "success.auth.password_change_success" }),
        });
      });

      await page.goto(`/${locale}/profile`);
      await page.getByRole("tab", { name: s.profile.tabs.security }).click();

      await page.fill("input#current_password", "OldPass123!");
      await page.fill("input#new_password", "NewPass123!");
      await page.fill("input#confirmPassword", "NewPass123!");

      await page.getByRole("button", { name: s.profile.security.submit }).click();

      await expect(
        page.locator("text=Mot de passe modifié").or(page.locator("text=successfully")).first(),
      ).toBeVisible();
    });
  });
}
