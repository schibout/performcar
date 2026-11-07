import { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, it, expect } from "vitest";

import {
  adminSupportKeys,
  supportKeys,
  useAdminReplyTicket,
  useAdminTicket,
  useAdminTickets,
  useCloseTicket,
  useCreateTicket,
  useMyTicket,
  useMyTickets,
  useReplyTicket,
  useUpdateAdminTicket,
} from "@/hooks/api/use-support";
import { Permission } from "@/lib/types/permissions";
import type { AdminTicketDetail, SupportMessage, SupportTicketDetail } from "@/lib/types/support";
import { SystemRole, type User } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";
import { server } from "@/test/msw/server";
import { createWrapper } from "@/test/test-utils";

// A persisting client for cache-side-effect assertions: the shared test client
// uses gcTime: 0, which immediately garbage-collects data written via
// setQueryData when no component observes the query.
const cacheClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });

// --- Fixtures ---------------------------------------------------------------

const mockMessage: SupportMessage = {
  id: "m-1",
  sender_id: "u-1",
  sender_role: "user",
  body: "Hello, I need help",
  read_at: null,
  created_at: "2026-01-01T00:00:00Z",
  attachments: [],
};

const mockTicketDetail: SupportTicketDetail = {
  id: "t-1",
  subject: "Cannot log in",
  status: "open",
  priority: "normal",
  last_message_at: "2026-01-01T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
  closed_at: null,
  messages: [mockMessage],
};

const mockAdminTicketDetail: AdminTicketDetail = {
  ...mockTicketDetail,
  assigned_admin_id: null,
  assigned_admin: null,
  user: { id: "u-1", email: "user@test.com", first_name: "Jane", last_name: "Doe" },
};

const listItem = {
  id: "t-1",
  subject: "Cannot log in",
  status: "open" as const,
  priority: "normal" as const,
  last_message_at: "2026-01-01T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
  closed_at: null,
  unread_count: 0,
};

// --- User hooks -------------------------------------------------------------

const makeUser = (permissions: Permission[]): User => ({
  id: "u-1",
  email: "u@test.com",
  first_name: null,
  last_name: null,
  title: null,
  role: SystemRole.USER,
  is_active: true,
  is_verified: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  deactivated_at: null,
  deletion_scheduled_at: null,
  suspended_at: null,
  permissions,
});

beforeEach(() => {
  useAuthStore.setState({ user: makeUser([Permission.SelfSupportRead]) });
});

afterEach(() => {
  useAuthStore.setState({ user: null });
});

describe("own ticket reads without self.support:read", () => {
  it("send no request when the permission is missing or the user is not loaded", async () => {
    const hits: string[] = [];
    server.use(
      http.get("*/api/v1/support/tickets", ({ request }) => {
        hits.push(request.url);
        return HttpResponse.json({ data: [], total: 0, skip: 0, limit: 20 });
      }),
      http.get("*/api/v1/support/tickets/t-1", ({ request }) => {
        hits.push(request.url);
        return HttpResponse.json({ data: {} });
      }),
    );
    for (const user of [makeUser([Permission.SelfNotificationsRead]), null]) {
      useAuthStore.setState({ user });
      const list = renderHook(() => useMyTickets({ limit: 20 }), { wrapper: createWrapper() });
      const one = renderHook(() => useMyTicket("t-1"), { wrapper: createWrapper() });
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 50);
      });
      expect(list.result.current.fetchStatus).toBe("idle");
      expect(one.result.current.fetchStatus).toBe("idle");
    }
    expect(hits).toEqual([]);
  });
});

describe("useMyTickets", () => {
  it("fetches the caller's tickets with total", async () => {
    server.use(
      http.get("*/api/v1/support/tickets", () =>
        HttpResponse.json({ data: [listItem], total: 1, skip: 0, limit: 20 }),
      ),
    );
    const { result } = renderHook(() => useMyTickets({ limit: 20 }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.data[0].id).toBe("t-1");
    expect(result.current.data?.total).toBe(1);
  });

  it("forwards the status filter to the query string", async () => {
    let requestedUrl = "";
    server.use(
      http.get("*/api/v1/support/tickets", ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({ data: [], total: 0, skip: 0, limit: 20 });
      }),
    );
    const { result } = renderHook(() => useMyTickets({ status: "open" }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(requestedUrl).toContain("status=open");
  });

  it("forwards the subject search to the query string", async () => {
    let requestedUrl = "";
    server.use(
      http.get("*/api/v1/support/tickets", ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({ data: [], total: 0, skip: 0, limit: 20 });
      }),
    );
    const { result } = renderHook(() => useMyTickets({ search: "payment" }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(requestedUrl).toContain("search=payment");
  });
});

describe("useMyTicket", () => {
  it("fetches a single ticket detail with its thread", async () => {
    server.use(http.get("*/api/v1/support/tickets/t-1", () => HttpResponse.json(mockTicketDetail)));
    const { result } = renderHook(() => useMyTicket("t-1"), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.messages).toHaveLength(1);
  });

  it("stays disabled when no id is provided", () => {
    const { result } = renderHook(() => useMyTicket(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useCreateTicket", () => {
  it("creates a ticket and primes the detail cache", async () => {
    server.use(
      http.post("*/api/v1/support/tickets", () =>
        HttpResponse.json(
          { ticket: mockTicketDetail, message: "success.support.ticketCreated" },
          { status: 201 },
        ),
      ),
    );
    const queryClient = cacheClient();
    const { result } = renderHook(() => useCreateTicket(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ subject: "Cannot log in", body: "Help", attachment_file_ids: ["f-1"] });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(queryClient.getQueryData(supportKeys.detail("t-1"))).toEqual(mockTicketDetail);
  });
});

describe("useReplyTicket", () => {
  it("posts a reply and resolves with the created message", async () => {
    server.use(
      http.post("*/api/v1/support/tickets/t-1/messages", () =>
        HttpResponse.json({ data: mockMessage, message: "success.support.messageSent" }),
      ),
    );
    const { result } = renderHook(() => useReplyTicket("t-1"), { wrapper: createWrapper() });

    result.current.mutate({ body: "Any update?" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.data.id).toBe("m-1");
  });
});

describe("useCloseTicket", () => {
  it("closes the ticket and writes the returned ticket into the cache", async () => {
    const closed: SupportTicketDetail = { ...mockTicketDetail, status: "closed" };
    server.use(
      http.post("*/api/v1/support/tickets/t-1/close", () =>
        HttpResponse.json({ ticket: closed, message: "success.support.ticketClosed" }),
      ),
    );
    const queryClient = cacheClient();
    const { result } = renderHook(() => useCloseTicket("t-1"), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(queryClient.getQueryData<SupportTicketDetail>(supportKeys.detail("t-1"))?.status).toBe(
      "closed",
    );
  });
});

// --- Admin hooks ------------------------------------------------------------

describe("useAdminTickets", () => {
  it("fetches the admin queue", async () => {
    server.use(
      http.get("*/api/v1/admin/support/tickets", () =>
        HttpResponse.json({
          data: [{ ...listItem, assigned_admin_id: null, user: mockAdminTicketDetail.user }],
          total: 1,
          skip: 0,
          limit: 50,
        }),
      ),
    );
    const { result } = renderHook(() => useAdminTickets({ limit: 50 }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.data[0].user.email).toBe("user@test.com");
  });

  it("forwards search and priority filters to the query string", async () => {
    let requestedUrl = "";
    server.use(
      http.get("*/api/v1/admin/support/tickets", ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({ data: [], total: 0, skip: 0, limit: 50 });
      }),
    );
    const { result } = renderHook(() => useAdminTickets({ search: "login", priority: "high" }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(requestedUrl).toContain("search=login");
    expect(requestedUrl).toContain("priority=high");
  });
});

describe("useAdminTicket", () => {
  it("fetches an admin ticket detail including the owner", async () => {
    server.use(
      http.get("*/api/v1/admin/support/tickets/t-1", () =>
        HttpResponse.json(mockAdminTicketDetail),
      ),
    );
    const { result } = renderHook(() => useAdminTicket("t-1"), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.user.email).toBe("user@test.com");
  });
});

describe("useAdminReplyTicket", () => {
  it("posts an admin reply and resolves with the message", async () => {
    const adminMessage: SupportMessage = { ...mockMessage, id: "m-2", sender_role: "admin" };
    server.use(
      http.post("*/api/v1/admin/support/tickets/t-1/messages", () =>
        HttpResponse.json({ data: adminMessage, message: "success.support.messageSent" }),
      ),
    );
    const { result } = renderHook(() => useAdminReplyTicket("t-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ body: "We're on it" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.data.sender_role).toBe("admin");
  });
});

describe("useUpdateAdminTicket", () => {
  it("patches the ticket and writes the result into the detail cache", async () => {
    const updated: AdminTicketDetail = {
      ...mockAdminTicketDetail,
      priority: "high",
      assigned_admin_id: "admin-9",
    };
    let requestBody: unknown;
    server.use(
      http.patch("*/api/v1/admin/support/tickets/t-1", async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({
          ticket: updated,
          message: "success.support.admin_ticket_updated",
        });
      }),
    );
    const queryClient = cacheClient();
    const { result } = renderHook(() => useUpdateAdminTicket("t-1"), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ priority: "high", assigned_admin_id: "admin-9" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(requestBody).toEqual({ priority: "high", assigned_admin_id: "admin-9" });
    expect(
      queryClient.getQueryData<AdminTicketDetail>(adminSupportKeys.detail("t-1"))?.priority,
    ).toBe("high");
  });
});
