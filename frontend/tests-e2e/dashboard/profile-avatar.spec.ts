import { test, expect } from "../base-test";
import { LOCALES, getStrings, type Locale } from "../i18n-strings";
import { SELF_PERMISSIONS } from "../user-fixtures";

import type { Page } from "@playwright/test";

const baseUser = {
  id: "user-123",
  email: "john@example.com",
  first_name: "John",
  last_name: "Doe",
  permissions: SELF_PERMISSIONS,
};

const avatarFile = {
  id: "f-1",
  url: "https://res.cloudinary.com/test/image/upload/a.png",
  content_type: "image/png",
  size: 1234,
  filename: "a.png",
  created_at: "2026-01-01T00:00:00Z",
};

// Minimal PNG signature — enough for the client-side MIME check.
const PNG_BUFFER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const setupAuth = async (page: Page, locale: Locale) => {
  await page.context().addCookies([
    { name: "access_token", value: "fake-jwt-token", domain: "127.0.0.1", path: "/" },
    { name: "NEXT_LOCALE", value: locale, domain: "127.0.0.1", path: "/" },
  ]);
  await page.addInitScript(
    (data: string) => {
      window.localStorage.setItem("auth-storage", data);
    },
    JSON.stringify({ state: { user: baseUser, isAuthenticated: true }, version: 0 }),
  );
};

for (const locale of LOCALES) {
  const su = getStrings(locale).upload;
  const sp = getStrings(locale).profile;

  test.describe(`Profile avatar [${locale}]`, () => {
    test("shows the avatar card with the upload action", async ({ page }) => {
      await setupAuth(page, locale);
      await page.route("**/api/v1/users/me", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(baseUser),
        }),
      );

      await page.goto(`/${locale}/profile`);

      await expect(page.getByText(sp.avatar.title).first()).toBeVisible();
      await expect(page.getByRole("button", { name: su.upload })).toBeVisible();
    });

    test("rejects an unsupported file type with an error toast", async ({ page }) => {
      await setupAuth(page, locale);
      await page.route("**/api/v1/users/me", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(baseUser),
        }),
      );

      await page.goto(`/${locale}/profile`);
      await page.setInputFiles('input[type="file"]', {
        name: "doc.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("hello"),
      });

      await expect(page.getByText(su.errors.invalid_type).first()).toBeVisible();
      // No upload happened, so the remove action must not appear.
      await expect(page.getByRole("button", { name: su.remove })).toBeHidden();
    });

    test("uploads an image and reveals the replace/remove actions", async ({ page }) => {
      await setupAuth(page, locale);
      await page.route("**/api/v1/upload", (route) =>
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(avatarFile),
        }),
      );
      await page.route("**/api/v1/users/me", async (route) => {
        if (route.request().method() === "PATCH") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              user: { ...baseUser, avatar_file: avatarFile },
              message: "success.user.updated",
            }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(baseUser),
        });
      });

      await page.goto(`/${locale}/profile`);
      await page.setInputFiles('input[type="file"]', {
        name: "a.png",
        mimeType: "image/png",
        buffer: PNG_BUFFER,
      });

      // Picking only stages a local preview (deferred upload); the user must
      // confirm with Save before anything hits Cloudinary/DB.
      await page.getByRole("button", { name: su.save, exact: true }).click();

      // After upload + attach, the editor switches to the replace/remove state.
      // `exact` avoids substring matches against longer button labels (e.g. the
      // header theme/language toggles or other action buttons).
      await expect(page.getByRole("button", { name: su.remove, exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: su.replace, exact: true })).toBeVisible();
    });
  });
}
