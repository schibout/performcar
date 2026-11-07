import type { AdminUser } from "@/lib/types/admin";
import { Permission } from "@/lib/types/permissions";
import type {
  AdminTicketDetail,
  AdminTicketListItem,
  SupportMessage,
  SupportTicketDetail,
  SupportTicketListItem,
} from "@/lib/types/support";

import { regularUser } from "../admin/admin-helpers";

import type { Page } from "@playwright/test";

// Session + user fixtures are shared with the admin suite to avoid drift.
export {
  adminUser,
  regularUser,
  injectSession,
  mockMe,
  mockAdminUsersList,
} from "../admin/admin-helpers";

// --- Fixtures ---------------------------------------------------------------

// An account whose role only lets it read its own tickets: no creating, replying,
// closing, notifications, uploads or profile edits.
export const restrictedUser: AdminUser = {
  ...regularUser,
  id: "user-restricted-1",
  email: "restricted@test.com",
  permissions: [Permission.SelfSupportRead],
};

export const userMessage: SupportMessage = {
  id: "m-1",
  sender_id: "user-1",
  sender_role: "user",
  body: "I cannot sign in to my account",
  read_at: null,
  created_at: "2026-01-01T10:00:00Z",
  attachments: [],
};

export const adminMessage: SupportMessage = {
  id: "m-2",
  sender_id: "admin-1",
  sender_role: "admin",
  body: "We are looking into it right away",
  read_at: null,
  created_at: "2026-01-01T11:00:00Z",
  attachments: [],
};

export const ticketListItem: SupportTicketListItem = {
  id: "t-1",
  subject: "Cannot sign in",
  status: "open",
  priority: "normal",
  last_message_at: "2026-01-01T10:00:00Z",
  created_at: "2026-01-01T10:00:00Z",
  closed_at: null,
  unread_count: 2,
};

export const ticketDetail: SupportTicketDetail = {
  id: "t-1",
  subject: "Cannot sign in",
  status: "open",
  priority: "normal",
  last_message_at: "2026-01-01T11:00:00Z",
  created_at: "2026-01-01T10:00:00Z",
  closed_at: null,
  messages: [userMessage, adminMessage],
};

export const closedTicketDetail: SupportTicketDetail = {
  ...ticketDetail,
  status: "closed",
  closed_at: "2026-01-02T00:00:00Z",
  messages: [userMessage],
};

const owner = { id: "user-1", email: "user@test.com", first_name: "Usain", last_name: "User" };

export const adminTicketListItem: AdminTicketListItem = {
  ...ticketListItem,
  assigned_admin_id: null,
  assigned_admin: null,
  user: owner,
};

export const adminTicketDetail: AdminTicketDetail = {
  ...ticketDetail,
  assigned_admin_id: null,
  assigned_admin: null,
  user: owner,
};

export const closedAdminTicketDetail: AdminTicketDetail = {
  ...adminTicketDetail,
  status: "closed",
  closed_at: "2026-01-02T00:00:00Z",
};

// --- Route mocks (user) -----------------------------------------------------

const listResponse = (data: SupportTicketListItem[], total = data.length) =>
  JSON.stringify({ data, total, skip: 0, limit: 10 });

// Handles both the collection GET (list) and the POST (create) on the same URL.
export const mockUserTickets = async (
  page: Page,
  options: { list: SupportTicketListItem[]; created?: SupportTicketDetail; total?: number },
): Promise<void> => {
  await page.route(/.*\/api\/v1\/support\/tickets(\?.*)?$/, async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: listResponse(options.list, options.total),
      });
    } else if (method === "POST" && options.created) {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ ticket: options.created, message: "success.support.ticketCreated" }),
      });
    } else {
      await route.fallback();
    }
  });
};

export const mockUserTicketDetail = async (
  page: Page,
  detail: SupportTicketDetail,
): Promise<void> => {
  await page.route(new RegExp(`.*/api/v1/support/tickets/${detail.id}$`), async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(detail),
    });
  });
};

export const mockUserReply = async (page: Page, message: SupportMessage): Promise<void> => {
  await page.route(/.*\/api\/v1\/support\/tickets\/[^/]+\/messages$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: message, message: "success.support.messageSent" }),
    });
  });
};

export const mockUserClose = async (page: Page, detail: SupportTicketDetail): Promise<void> => {
  await page.route(/.*\/api\/v1\/support\/tickets\/[^/]+\/close$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ticket: { ...detail, status: "closed" },
        message: "success.support.ticketClosed",
      }),
    });
  });
};

// --- Route mocks (admin) ----------------------------------------------------

export const mockAdminTickets = async (
  page: Page,
  rows: AdminTicketListItem[],
  total = rows.length,
): Promise<void> => {
  await page.route(/.*\/api\/v1\/admin\/support\/tickets(\?.*)?$/, async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: rows, total, skip: 0, limit: 25 }),
    });
  });
};

// Handles the detail GET and the PATCH (status/priority/assignment update).
export const mockAdminTicketDetail = async (
  page: Page,
  detail: AdminTicketDetail,
): Promise<void> => {
  await page.route(new RegExp(`.*/api/v1/admin/support/tickets/${detail.id}$`), async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(detail),
      });
    } else if (method === "PATCH") {
      const body = route.request().postDataJSON() as Partial<AdminTicketDetail>;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ticket: { ...detail, ...body },
          message: "success.support.admin_ticket_updated",
        }),
      });
    } else {
      await route.fallback();
    }
  });
};

export const mockAdminReply = async (page: Page, message: SupportMessage): Promise<void> => {
  await page.route(/.*\/api\/v1\/admin\/support\/tickets\/[^/]+\/messages$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: message, message: "success.support.messageSent" }),
    });
  });
};
