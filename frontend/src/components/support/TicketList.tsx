"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { TicketStatusBadge } from "@/components/support/TicketStatusBadge";
import { getLocaleFromPath, getLocalizedPath, ROUTES } from "@/lib/config/routes";
import { formatDate } from "@/lib/format-date";
import type { SupportTicketListItem } from "@/lib/types/support";

interface TicketListProps {
  rows: SupportTicketListItem[];
  isLoading: boolean;
}

export function TicketList({ rows, isLoading }: TicketListProps) {
  const { t } = useTranslation("support");
  const locale = getLocaleFromPath(usePathname());

  if (rows.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground">
        {isLoading ? t("list.loading") : t("list.empty")}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map((ticket) => (
        <li key={ticket.id}>
          <Link
            href={getLocalizedPath(`${ROUTES.support}/${ticket.id}`, locale)}
            className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{ticket.subject}</p>
              <p className="text-xs text-muted-foreground">{formatDate(ticket.last_message_at)}</p>
            </div>
            {ticket.unread_count > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                {ticket.unread_count}
              </span>
            ) : null}
            <TicketStatusBadge status={ticket.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
