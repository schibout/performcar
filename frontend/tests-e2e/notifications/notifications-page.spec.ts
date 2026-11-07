import type { NotificationItem } from "@/lib/types/notification";

import { test, expect } from "../base-test";
import { LOCALES, getStrings, reEscape } from "../i18n-strings";
import {
  adminUser,
  fillTemplate,
  injectSession,
  mockMe,
  mockNotifications,
  permissionsNotification,
  regularUser,
  repliedNotification,
} from "./notification-helpers";

// Enough unread entries to spill onto a second page (DEFAULT_PAGE_SIZE = 10).
const manyNotifications = (count: number): NotificationItem[] =>
  Array.from({ length: count }, (_, index) => ({
    ...repliedNotification,
    id: `n-${index + 1}`,
    data: { ticket_id: `t-${index + 1}`, subject: `Ticket ${index + 1}` },
  }));

for (const locale of LOCALES) {
  const s = getStrings(locale);
  const repliedText = fillTemplate(s.notifications.types.support_ticket_replied, {
    subject: "Cannot sign in",
  });

  test.describe(`Notifications page [${locale}]`, () => {
    test("renders the inbox with translated rows", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      await mockNotifications(page, [repliedNotification, permissionsNotification]);

      await page.goto(`/${locale}/notifications`);

      await expect(page.getByRole("heading", { name: s.notifications.title })).toBeVisible();
      await expect(page.getByText(s.notifications.page.subtitle)).toBeVisible();
      await expect(page.getByText(repliedText)).toBeVisible();
      await expect(page.getByText(s.notifications.actions.set_admin_permissions)).toBeVisible();
    });

    test("the unread filter hides read entries", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      await mockNotifications(page, [
        { ...repliedNotification, read_at: "2026-01-02T00:00:00Z" },
        permissionsNotification,
      ]);

      await page.goto(`/${locale}/notifications`);
      await expect(page.getByText(repliedText)).toBeVisible();

      await page.getByText(s.notifications.page.filterUnread, { exact: true }).click();

      await expect(page.getByText(repliedText)).toBeHidden();
      await expect(page.getByText(s.notifications.actions.set_admin_permissions)).toBeVisible();
    });

    test("paginates past the default page size", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      await mockNotifications(page, manyNotifications(12));

      await page.goto(`/${locale}/notifications`);

      await expect(
        page.getByText(
          fillTemplate(s.notifications.types.support_ticket_replied, { subject: "Ticket 1" }),
        ),
      ).toBeVisible();
      await expect(
        page.getByText(
          fillTemplate(s.notifications.types.support_ticket_replied, { subject: "Ticket 11" }),
        ),
      ).toBeHidden();

      await page.getByRole("button", { name: s.admin.users.pagination.next, exact: true }).click();

      await expect(
        page.getByText(
          fillTemplate(s.notifications.types.support_ticket_replied, { subject: "Ticket 11" }),
        ),
      ).toBeVisible();
      await expect(
        page.getByText(
          fillTemplate(s.notifications.types.support_ticket_replied, { subject: "Ticket 1" }),
        ),
      ).toBeHidden();
    });

    test("mark all as read empties the unread filter", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      await mockNotifications(page, [repliedNotification, permissionsNotification]);

      await page.goto(`/${locale}/notifications`);
      await page.getByRole("button", { name: s.notifications.markAllRead }).click();

      await expect(page.getByRole("button", { name: s.notifications.markAllRead })).toBeHidden();

      await page.getByText(s.notifications.page.filterUnread, { exact: true }).click();
      await expect(page.getByText(s.notifications.empty)).toBeVisible();
    });

    test("the bell's view-all link opens the inbox page", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      await mockNotifications(page, [repliedNotification]);

      await page.goto(`/${locale}/dashboard`);
      await page.getByRole("button", { name: s.notifications.bell }).click();
      await page.getByRole("button", { name: s.notifications.viewAll }).click();

      await expect(page).toHaveURL(new RegExp(`/${locale}/notifications`));
      await expect(page.getByRole("heading", { name: s.notifications.title })).toBeVisible();
    });

    test("the admin inbox renders inside the admin shell", async ({ page }) => {
      await injectSession(page, adminUser, locale);
      await mockMe(page, adminUser);
      await mockNotifications(page, [repliedNotification, permissionsNotification]);

      await page.goto(`/${locale}/admin/notifications`);

      await expect(page.getByRole("heading", { name: s.notifications.title })).toBeVisible();
      await expect(page.getByText(repliedText)).toBeVisible();
      await expect(page.getByText(s.notifications.actions.set_admin_permissions)).toBeVisible();
    });
  });

  test.describe(`Notifications mobile drawer [${locale}]`, () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test("the mobile drawer links to the inbox page", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      // Empty inbox keeps the unread badge off the nav link, so its accessible
      // name stays an exact "Notifications" (no trailing count).
      await mockNotifications(page, []);

      await page.goto(`/${locale}/dashboard`);
      await page
        .getByRole("button", { name: new RegExp(reEscape(s.common.ui.toggleMenu), "i") })
        .first()
        .click();
      await page.getByRole("button", { name: s.common.nav.notifications, exact: true }).click();

      await expect(page).toHaveURL(new RegExp(`/${locale}/notifications`));
      await expect(page.getByRole("heading", { name: s.notifications.title })).toBeVisible();
    });
  });
}
