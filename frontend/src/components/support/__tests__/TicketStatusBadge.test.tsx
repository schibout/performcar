import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TicketPriorityBadge, TicketStatusBadge } from "@/components/support/TicketStatusBadge";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/types/support";

describe("TicketStatusBadge", () => {
  it.each(TICKET_STATUSES)("renders the %s status label", (status) => {
    render(<TicketStatusBadge status={status} />);
    expect(screen.getByText(`support:status.${status}`)).toBeInTheDocument();
  });
});

describe("TicketPriorityBadge", () => {
  it.each(TICKET_PRIORITIES)("renders the %s priority label", (priority) => {
    render(<TicketPriorityBadge priority={priority} />);
    expect(screen.getByText(`support:priority.${priority}`)).toBeInTheDocument();
  });
});
