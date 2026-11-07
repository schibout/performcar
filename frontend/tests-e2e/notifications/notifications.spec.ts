import { test, expect } from "../base-test";
import { LOCALES, getStrings } from "../i18n-strings";
import {
  bellBadge,
  fillTemplate,
  injectSession,
  mockMe,
  mockNotifications,
  permissionsNotification,
  regularUser,
  repliedNotification,
} from "./notification-helpers";

import type { Page } from "@playwright/test";

// Not re-exported from @playwright/test (it lives in playwright-core), so
// derive the handler's route type from the routeWebSocket signature instead.
type WebSocketRoute = Parameters<Parameters<Page["routeWebSocket"]>[1]>[0];

for (const locale of LOCALES) {
  const s = getStrings(locale);
  const bell = (page: Page) => page.getByRole("button", { name: s.notifications.bell });
  const badge = bellBadge;

  test.describe(`Notification bell [${locale}]`, () => {
    test("shows the unread count on the bell badge", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      await mockNotifications(page, [repliedNotification, permissionsNotification]);

      await page.goto(`/${locale}/dashboard`);

      await expect(bell(page)).toBeVisible();
      await expect(badge(page)).toHaveText("2");
    });

    test("opens the panel with translated notification texts", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      await mockNotifications(page, [repliedNotification, permissionsNotification]);

      await page.goto(`/${locale}/dashboard`);
      await bell(page).click();

      await expect(page.getByText(s.notifications.title)).toBeVisible();
      await expect(
        page.getByText(
          fillTemplate(s.notifications.types.support_ticket_replied, {
            subject: "Cannot sign in",
          }),
        ),
      ).toBeVisible();
      await expect(page.getByText(s.notifications.actions.set_admin_permissions)).toBeVisible();
    });

    test("mark all as read clears the badge and hides the button", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      await mockNotifications(page, [repliedNotification, permissionsNotification]);

      await page.goto(`/${locale}/dashboard`);
      await bell(page).click();
      await page.getByRole("button", { name: s.notifications.markAllRead }).click();

      await expect(badge(page)).toBeHidden();
      await expect(page.getByRole("button", { name: s.notifications.markAllRead })).toBeHidden();
    });

    test("shows the empty state when the inbox is empty", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      await mockNotifications(page, []);

      await page.goto(`/${locale}/dashboard`);
      await bell(page).click();

      await expect(page.getByText(s.notifications.empty)).toBeVisible();
      await expect(badge(page)).toBeHidden();
    });

    test("a websocket push updates the badge without a reload", async ({ page }) => {
      await injectSession(page, regularUser, locale);
      await mockMe(page, regularUser);
      const state = await mockNotifications(page, []);

      // Registered after base-test's catch-all WS no-op, so this route wins
      // for the notification feed and hands us the server side of the socket.
      // Collected in an array because TS does not track assignments made
      // inside the route callback (a plain `let` narrows back to null).
      const feeds: WebSocketRoute[] = [];
      await page.routeWebSocket(/\/api\/v1\/notifications\/ws/, (ws) => {
        feeds.push(ws);
      });

      await page.goto(`/${locale}/dashboard`);
      await expect(badge(page)).toBeHidden();
      await expect.poll(() => feeds.length).toBeGreaterThan(0);

      // The push triggers a refetch; the mock now reports one unread entry.
      // Send on the LAST captured socket: React strict mode double-mounts the
      // bell in dev, so the first connection is already closed.
      state.list = [repliedNotification];
      feeds
        .at(-1)
        ?.send(JSON.stringify({ type: "notification_created", notification: repliedNotification }));

      await expect(badge(page)).toHaveText("1");
    });
  });
}
