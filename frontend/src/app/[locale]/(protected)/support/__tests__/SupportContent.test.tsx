import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getLocalizedPath, ROUTES } from "@/lib/config/routes";
import { Permission } from "@/lib/types/permissions";
import { SystemRole, type User } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/test-utils";

import { SupportContent } from "../SupportContent";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => getLocalizedPath(ROUTES.support, "en"),
  useParams: () => ({ locale: "en" }),
}));

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

const ticket = {
  id: "t-1",
  subject: "Cannot sign in",
  status: "open",
  priority: "normal",
  last_message_at: "2026-01-01T10:00:00Z",
  created_at: "2026-01-01T10:00:00Z",
  closed_at: null,
  unread_count: 0,
};

const mockTickets = (hits: string[]) => {
  server.use(
    http.get("*/api/v1/support/tickets", ({ request }) => {
      hits.push(request.url);
      return HttpResponse.json({ data: [ticket], total: 1, skip: 0, limit: 20 });
    }),
  );
};

afterEach(() => {
  useAuthStore.setState({ user: null });
});

describe("SupportContent", () => {
  it("shows the tickets of a read-only account without the creation button", async () => {
    mockTickets([]);
    useAuthStore.setState({ user: makeUser([Permission.SelfSupportRead]) });

    renderWithProviders(<SupportContent />);

    expect(await screen.findByText("Cannot sign in")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /list\.newTicket/ })).not.toBeInTheDocument();
  });

  it("offers ticket creation to an account holding self.support:create", async () => {
    mockTickets([]);
    useAuthStore.setState({
      user: makeUser([Permission.SelfSupportRead, Permission.SelfSupportCreate]),
    });

    renderWithProviders(<SupportContent />);

    expect(await screen.findByRole("button", { name: /list\.newTicket/ })).toBeInTheDocument();
  });

  it("shows a permission note and sends no request without self.support:read", async () => {
    const hits: string[] = [];
    mockTickets(hits);
    useAuthStore.setState({ user: makeUser([Permission.SelfNotificationsRead]) });

    renderWithProviders(<SupportContent />);

    expect(await screen.findByText("support:restricted")).toBeInTheDocument();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(hits).toEqual([]);
  });

  it("shows neither a forbidden note nor a request while the user is not loaded", async () => {
    const hits: string[] = [];
    mockTickets(hits);

    renderWithProviders(<SupportContent />);

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(screen.queryByText("support:restricted")).not.toBeInTheDocument();
    expect(hits).toEqual([]);
  });

  it("lets a superadmin see and create everything", async () => {
    mockTickets([]);
    useAuthStore.setState({ user: { ...makeUser([]), role: SystemRole.SUPERADMIN } });

    renderWithProviders(<SupportContent />);

    await waitFor(() => {
      expect(screen.getByText("Cannot sign in")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /list\.newTicket/ })).toBeInTheDocument();
  });
});
