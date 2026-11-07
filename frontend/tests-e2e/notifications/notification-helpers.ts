import type { NotificationItem } from "@/lib/types/notification";

import type { Locator, Page } from "@playwright/test";

// Session + user fixtures are shared with the admin suite to avoid drift.
export { adminUser, injectSession, mockMe, regularUser } from "../admin/admin-helpers";

// --- Fixtures ---------------------------------------------------------------

export const repliedNotification: NotificationItem = {
  id: "n-1",
  type: "support_ticket_replied",
  data: { ticket_id: "t-1", subject: "Cannot sign in" },
  read_at: null,
  created_at: "2026-01-01T10:00:00Z",
};

export const permissionsNotification: NotificationItem = {
  id: "n-2",
  type: "admin_permissions_changed",
  data: { action: "set_admin_permissions" },
  read_at: null,
  created_at: "2026-01-01T09:00:00Z",
};

export interface NotificationMockState {
  list: NotificationItem[];
}

const unreadCount = (state: NotificationMockState): number =>
  state.list.filter((item) => item.read_at === null).length;

// antd's <Badge> exposes its counter only via this library-internal class.
// Kept here as the single page-object accessor so specs never hardcode it.
export const bellBadge = (page: Page): Locator => page.locator(".ant-badge-count");

// Substitute {{var}} placeholders the same way i18next renders them, so specs
// can assert the exact translated copy for a fixture.
export const fillTemplate = (template: string, vars: Record<string, string>): string =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");

// Stateful mock for every /notifications endpoint: the read mutations update
// the shared state, so the refetch triggered by cache invalidation observes
// the new read/unread split — mirroring the real backend.
export const mockNotifications = async (
  page: Page,
  initial: NotificationItem[],
): Promise<NotificationMockState> => {
  const state: NotificationMockState = { list: initial };
  const readStamp = "2026-01-02T00:00:00Z";

  // The list endpoint honours skip/limit/unread_only the same way the real
  // backend does, so filter and pagination specs exercise true behaviour.
  await page.route(/.*\/api\/v1\/notifications(\?.*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const skip = Number(url.searchParams.get("skip") ?? "0");
    const limit = Number(url.searchParams.get("limit") ?? "10");
    const unreadOnly = url.searchParams.get("unread_only") === "true";
    const filtered = unreadOnly ? state.list.filter((item) => item.read_at === null) : state.list;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: filtered.slice(skip, skip + limit),
        total: filtered.length,
        skip,
        limit,
      }),
    });
  });

  await page.route(/.*\/api\/v1\/notifications\/unread-count$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ unread_count: unreadCount(state) }),
    });
  });

  await page.route(/.*\/api\/v1\/notifications\/read-all$/, async (route) => {
    const updated = unreadCount(state);
    state.list = state.list.map((item) => ({ ...item, read_at: item.read_at ?? readStamp }));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ updated, message: "success.notification.all_read" }),
    });
  });

  await page.route(/.*\/api\/v1\/notifications\/[^/]+\/read$/, async (route) => {
    const id = new URL(route.request().url()).pathname.split("/").at(-2);
    state.list = state.list.map((item) =>
      item.id === id ? { ...item, read_at: item.read_at ?? readStamp } : item,
    );
    const item = state.list.find((row) => row.id === id);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: item, message: "success.notification.read" }),
    });
  });

  return state;
};
