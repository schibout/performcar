import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/types/support";

// Filter values add an "all" sentinel on top of the domain unions. Kept in a
// standalone module (no React) so the filter component stays compatible with
// the `react-refresh/only-export-components` rule.
export type TicketStatusFilter = TicketStatus | "all";
export type TicketPriorityFilter = TicketPriority | "all";

export const isTicketStatusFilter = (value: string): value is TicketStatusFilter =>
  value === "all" || (TICKET_STATUSES as readonly string[]).includes(value);

export const isTicketPriorityFilter = (value: string): value is TicketPriorityFilter =>
  value === "all" || (TICKET_PRIORITIES as readonly string[]).includes(value);
