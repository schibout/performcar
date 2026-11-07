"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import {
  AdminTable,
  AdminTableStateRow,
  AdminTbody,
  AdminTd,
  AdminTh,
  AdminThead,
  AdminTr,
} from "@/components/admin/shared/AdminTable";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/support/TicketStatusBadge";
import { getLocaleFromPath, getLocalizedPath, ROUTES } from "@/lib/config/routes";
import { formatDate } from "@/lib/format-date";
import type { AdminTicketListItem } from "@/lib/types/support";

interface SupportTicketsTableProps {
  rows: AdminTicketListItem[];
  isLoading: boolean;
}

const requesterLabel = (ticket: AdminTicketListItem): string => {
  const name = [ticket.user.first_name, ticket.user.last_name].filter(Boolean).join(" ");
  return name || ticket.user.email;
};

const assigneeName = (ticket: AdminTicketListItem): string | null => {
  const admin = ticket.assigned_admin;
  if (!admin) return null;
  return [admin.first_name, admin.last_name].filter(Boolean).join(" ") || admin.email;
};

export function SupportTicketsTable({ rows, isLoading }: SupportTicketsTableProps) {
  const { t } = useTranslation("support");
  const locale = getLocaleFromPath(usePathname());

  return (
    <AdminTable>
      <AdminThead>
        <AdminTh>{t("admin.columns.subject")}</AdminTh>
        <AdminTh>{t("admin.columns.requester")}</AdminTh>
        <AdminTh>{t("admin.columns.status")}</AdminTh>
        <AdminTh>{t("admin.columns.priority")}</AdminTh>
        <AdminTh>{t("admin.columns.assignee")}</AdminTh>
        <AdminTh className="text-center">{t("admin.columns.updated")}</AdminTh>
        <AdminTh aria-hidden />
      </AdminThead>
      <AdminTbody>
        {rows.map((ticket) => {
          const href = getLocalizedPath(`${ROUTES.adminSupport}/${ticket.id}`, locale);
          return (
            <AdminTr key={ticket.id}>
              <AdminTd>
                <Link
                  href={href}
                  className="flex items-center gap-2 font-medium transition-colors hover:text-primary"
                >
                  <span className="truncate">{ticket.subject}</span>
                  {ticket.unread_count > 0 ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                      {ticket.unread_count}
                    </span>
                  ) : null}
                </Link>
              </AdminTd>
              <AdminTd className="text-muted-foreground">{requesterLabel(ticket)}</AdminTd>
              <AdminTd>
                <TicketStatusBadge status={ticket.status} />
              </AdminTd>
              <AdminTd>
                <TicketPriorityBadge priority={ticket.priority} />
              </AdminTd>
              <AdminTd className="text-muted-foreground">
                {assigneeName(ticket) ?? (
                  <span className="text-xs italic opacity-70">{t("admin.unassigned")}</span>
                )}
              </AdminTd>
              <AdminTd className="whitespace-nowrap text-center text-xs text-muted-foreground">
                {formatDate(ticket.last_message_at)}
              </AdminTd>
              <AdminTd className="text-right">
                <Link
                  href={href}
                  className="inline-flex text-muted-foreground transition-all hover:text-primary group-hover:translate-x-0.5"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </AdminTd>
            </AdminTr>
          );
        })}
        {rows.length === 0 ? (
          <AdminTableStateRow
            colSpan={7}
            isLoading={isLoading}
            loadingLabel={t("admin.loading")}
            emptyLabel={t("admin.empty")}
          />
        ) : null}
      </AdminTbody>
    </AdminTable>
  );
}
