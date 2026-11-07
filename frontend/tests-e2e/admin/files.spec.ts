import { test, expect } from "../base-test";
import { adminFile, adminUser, injectSession, mockAdminFilesList, mockMe } from "./admin-helpers";
import { LOCALES, getStrings } from "./admin-strings";

for (const locale of LOCALES) {
  const s = getStrings(locale).admin;

  test.describe(`Admin files [${locale}]`, () => {
    test("lists uploaded files with their uploader", async ({ page }) => {
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await mockAdminFilesList(page, [adminFile]);

      await page.goto(`/${locale}/admin/files`);

      await expect(page.getByRole("heading", { name: s.files.title })).toBeVisible();
      await expect(page.getByText("report.png")).toBeVisible();
      await expect(page.getByText("Usain User")).toBeVisible();
    });

    test("shows the empty state when there are no files", async ({ page }) => {
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await mockAdminFilesList(page, [], 0);

      await page.goto(`/${locale}/admin/files`);

      await expect(page.getByText(s.files.empty)).toBeVisible();
    });

    test("deletes a file after confirming in the modal", async ({ page }) => {
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await mockAdminFilesList(page, [adminFile]);

      let deleteCalled = false;
      await page.route(new RegExp(`.*/api/v1/admin/files/${adminFile.id}$`), async (route) => {
        if (route.request().method() === "DELETE") {
          deleteCalled = true;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true, message: "success.admin.file_deleted" }),
          });
          return;
        }
        await route.fallback();
      });

      await page.goto(`/${locale}/admin/files`);

      await page.getByRole("button", { name: s.files.rowActions.delete }).click();
      // The row trash icon shares its label with the modal's confirm button, so
      // scope the confirm click to the dialog.
      await page
        .getByRole("dialog")
        .getByRole("button", { name: s.files.confirmDelete.confirm })
        .click();

      await expect.poll(() => deleteCalled).toBe(true);
    });
  });
}
