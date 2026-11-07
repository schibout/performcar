import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getLocalizedPath, ROUTES } from "@/lib/config/routes";
import { Permission } from "@/lib/types/permissions";
import { SystemRole, type User } from "@/lib/types/user";
import { useAuthStore } from "@/stores/auth.store";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/test-utils";

import { TicketDetailContent } from "../[id]/TicketDetailContent";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => getLocalizedPath(`${ROUTES.support}/t-1`, "en"),
  useParams: () => ({ locale: "en" }),
}));

vi.mock("@/hooks/use-support-realtime", () => ({ useTicketRealtime: vi.fn() }));

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

const detail = {
  id: "t-1",
  subject: "Cannot sign in",
  status: "open",
  priority: "normal",
  last_message_at: "2026-01-01T11:00:00Z",
  created_at: "2026-01-01T10:00:00Z",
  closed_at: null,
  unread_count: 0,
  messages: [],
};

afterEach(() => {
  useAuthStore.setState({ user: null });
});

const mockDetail = () => {
  server.use(http.get("*/api/v1/support/tickets/t-1", () => HttpResponse.json(detail)));
};

describe("TicketDetailContent", () => {
  it("shows the thread without reply box or close button for a read-only account", async () => {
    mockDetail();
    useAuthStore.setState({ user: makeUser([Permission.SelfSupportRead]) });

    renderWithProviders(<TicketDetailContent ticketId="t-1" />);

    expect(await screen.findByText("Cannot sign in")).toBeInTheDocument();
    expect(screen.getByText("support:detail.replyRestricted")).toBeInTheDocument();
    expect(screen.queryByText("support:detail.send")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /detail\.close/ })).not.toBeInTheDocument();
  });

  it("shows the reply box and close button when reply and close are granted", async () => {
    mockDetail();
    useAuthStore.setState({
      user: makeUser([
        Permission.SelfSupportRead,
        Permission.SelfSupportReply,
        Permission.SelfSupportClose,
      ]),
    });

    renderWithProviders(<TicketDetailContent ticketId="t-1" />);

    expect(await screen.findByText("support:detail.send")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /detail\.close/ })).toBeInTheDocument();
  });

  it("shows a permission note instead of a broken page without self.support:read", async () => {
    mockDetail();
    useAuthStore.setState({ user: makeUser([]) });

    renderWithProviders(<TicketDetailContent ticketId="t-1" />);

    expect(await screen.findByText("support:restricted")).toBeInTheDocument();
    expect(screen.queryByText("support:list.notFound")).not.toBeInTheDocument();
  });
});
