import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TicketList } from "@/components/support/TicketList";
import type { SupportTicketListItem } from "@/lib/types/support";

const row = (overrides: Partial<SupportTicketListItem> = {}): SupportTicketListItem => ({
  id: "t-1",
  subject: "Cannot log in",
  status: "open",
  priority: "normal",
  last_message_at: "2026-01-01T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
  closed_at: null,
  unread_count: 0,
  ...overrides,
});

describe("TicketList", () => {
  it("shows the empty label when there are no rows and not loading", () => {
    render(<TicketList rows={[]} isLoading={false} />);
    expect(screen.getByText("support:list.empty")).toBeInTheDocument();
  });

  it("shows the loading label when there are no rows and loading", () => {
    render(<TicketList rows={[]} isLoading />);
    expect(screen.getByText("support:list.loading")).toBeInTheDocument();
  });

  it("renders a row as a link to the ticket detail with its status", () => {
    render(<TicketList rows={[row()]} isLoading={false} />);
    expect(screen.getByText("Cannot log in")).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toContain("/support/t-1");
    expect(screen.getByText("support:status.open")).toBeInTheDocument();
  });

  it("renders the unread badge only when unread_count is positive", () => {
    const { rerender } = render(<TicketList rows={[row({ unread_count: 3 })]} isLoading={false} />);
    expect(screen.getByText("3")).toBeInTheDocument();

    rerender(<TicketList rows={[row({ unread_count: 0 })]} isLoading={false} />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
