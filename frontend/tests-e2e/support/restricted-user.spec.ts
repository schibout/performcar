import { test, expect } from "../base-test";
import { LOCALES, getStrings } from "../i18n-strings";
import {
  injectSession,
  mockMe,
  mockUserTicketDetail,
  mockUserTickets,
  regularUser,
  restrictedUser,
  ticketDetail,
  ticketListItem,
} from "./support-helpers";

for (const locale of LOCALES) {
  const s = getStrings(locale);

  test.describe(`Restricted user [${locale}]`, () => {
    test("sees their tickets without a creation button", async ({ page }) => {
      await injectSession(page, restrictedUser, locale);
      await mockMe(page, restrictedUser);
      await mockUserTickets(page, { list: [ticketListItem] });

      await page.goto(`/${locale}/support`);

      await expect(page.getByText(ticketListItem.subject)).toBeVisible();
      await expect(page.getByRole("button", { name: s.support.list.newTicket })).toHaveCount(0);
    });

    test("reads a ticket thread without reply box or close button", async ({ page }) => {
      await injectSession(page, restrictedUser, locale);
      await mockMe(page, restrictedUser);
      await mockUserTicketDetail(page, ticketDetail);

      await page.goto(`/${locale}/support/${ticketDetail.id}`);

      await expect(page.getByText(ticketDetail.messages[0].body)).toBeVisible();
      await expect(page.getByPlaceholder(s.support.detail.replyPlaceholder)).toHaveCount(0);
      await expect(page.getByRole("button", { name: s.support.detail.send })).toHaveCount(0);
      await expect(page.getByRole("button", { name: s.support.detail.close })).toHaveCount(0);
      await expect(page.getByText(s.support.detail.replyRestricted)).toBeVisible();
    });

    test("sends no notification request or socket and hides the bell", async ({ page }) => {
      const notificationRequests: string[] = [];
      page.on("request", (request) => {
        if (request.url().includes("/api/v1/notifications")) {
          notificationRequests.push(request.url());
        }
      });
      let notificationSocketOpened = false;
      await page.routeWebSocket(/\/api\/v1\/notifications\/ws/, () => {
        notificationSocketOpened = true;
      });
      await injectSession(page, restrictedUser, locale);
      await mockMe(page, restrictedUser);
      await mockUserTickets(page, { list: [ticketListItem] });

      await page.goto(`/${locale}/support`);
      await expect(page.getByText(ticketListItem.subject)).toBeVisible();

      await expect(page.getByRole("button", { name: s.notifications.bell })).toHaveCount(0);
      expect(notificationRequests).toEqual([]);
      expect(notificationSocketOpened).toBe(false);
    });

    test("opening the notifications page directly shows a permission note", async ({ page }) => {
      await injectSession(page, restrictedUser, locale);
      await mockMe(page, restrictedUser);

      await page.goto(`/${locale}/notifications`);

      await expect(page.getByText(s.notifications.restricted)).toBeVisible();
    });

    test("cannot pick an avatar and is told why", async ({ page }) => {
      await injectSession(page, restrictedUser, locale);
      await mockMe(page, restrictedUser);

      await page.goto(`/${locale}/profile`);

      await expect(page.getByText(s.profile.avatar.uploadRestricted)).toBeVisible();
      await expect(page.getByRole("button", { name: s.upload.upload })).toBeDisabled();
    });

    test("keeps the account pages reachable", async ({ page }) => {
      await injectSession(page, restrictedUser, locale);
      await mockMe(page, restrictedUser);

      await page.goto(`/${locale}/profile`);

      await expect(page.getByRole("tab", { name: s.profile.tabs.security })).toBeVisible();
    });
  });

  test.describe(`Standard user [${locale}]`, () => {
    test("still sees the creation button and the reply box", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      await mockUserTickets(page, { list: [ticketListItem] });
      await mockUserTicketDetail(page, ticketDetail);

      await page.goto(`/${locale}/support`);
      await expect(page.getByRole("button", { name: s.support.list.newTicket })).toBeVisible();

      await page.goto(`/${locale}/support/${ticketDetail.id}`);
      await expect(page.getByPlaceholder(s.support.detail.replyPlaceholder)).toBeVisible();
      await expect(page.getByRole("button", { name: s.support.detail.close })).toBeVisible();
    });
  });
}
