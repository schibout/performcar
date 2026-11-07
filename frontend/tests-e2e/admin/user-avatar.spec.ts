import type { AdminUser } from "@/lib/types/admin";

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

const userWithAvatar: AdminUser = {
  ...regularUser,
  avatar_file: {
    id: "f-9",
    url: "https://res.cloudinary.com/test/image/upload/u.png",
    content_type: "image/png",
    size: 2048,
    filename: "u.png",
    category: "general",
    created_at: "2026-01-03T00:00:00Z",
  },
};

for (const locale of LOCALES) {
  const s = getStrings(locale).admin;
  const su = getStrings(locale).upload;

  test.describe(`Admin user avatar [${locale}]`, () => {
    test("renders the profile-photo card on the detail page", async ({ page }) => {
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await mockAdminUserDetail(page, userWithAvatar);
      await mockAdminActivities(page);

      await page.goto(`/${locale}/admin/users/${userWithAvatar.id}`);

      await expect(page.getByText(s.userDetail.avatarTitle).first()).toBeVisible();
      await expect(page.getByRole("button", { name: su.remove })).toBeVisible();
    });

    test("removes the user's avatar after confirming in the modal", async ({ page }) => {
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await mockAdminUserDetail(page, userWithAvatar);
      await mockAdminActivities(page);

      let patchBody: { avatar_file_id?: string | null } | null = null;
      await page.route(new RegExp(`.*/api/v1/admin/users/${userWithAvatar.id}$`), async (route) => {
        if (route.request().method() === "PATCH") {
          patchBody = route.request().postDataJSON() as { avatar_file_id?: string | null };
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              user: { ...userWithAvatar, avatar_file: null },
              message: "success.admin.user_updated",
            }),
          });
          return;
        }
        // Let mockAdminUserDetail serve the GET.
        await route.fallback();
      });

      await page.goto(`/${locale}/admin/users/${userWithAvatar.id}`);

      await page.getByRole("button", { name: su.remove }).click();

      // Destructive removal is gated behind a confirm modal.
      await expect(page.getByText(s.userDetail.removeAvatarTitle)).toBeVisible();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: s.userDetail.removeAvatarConfirm })
        .click();

      await expect.poll(() => patchBody?.avatar_file_id).toBeNull();
    });
  });
}
