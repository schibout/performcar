"use client";

import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { PermissionNote } from "@/components/admin/shared/PermissionNote";
import { TicketAdminControls } from "@/components/admin/support/TicketAdminControls";
import { MessageThread } from "@/components/support/MessageThread";
import { ReplyBox } from "@/components/support/ReplyBox";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/support/TicketStatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminSupportKeys, useAdminReplyTicket, useAdminTicket } from "@/hooks/api/use-support";
import { useCanWriteSupport } from "@/hooks/use-permissions";
import { useTicketRealtime } from "@/hooks/use-support-realtime";
import { getLocaleFromPath, getLocalizedPath, ROUTES } from "@/lib/config/routes";

interface AdminTicketDetailContentProps {
  ticketId: string;
}

export function AdminTicketDetailContent({ ticketId }: AdminTicketDetailContentProps) {
  const { t } = useTranslation("support");
  const locale = getLocaleFromPath(usePathname());
  const queryClient = useQueryClient();
  const { data: ticket, isLoading } = useAdminTicket(ticketId);
  const reply = useAdminReplyTicket(ticketId);
  const canReply = useCanWriteSupport();

  // Live updates: customer replies and edits by other admins stream in via the
  // shared support socket while this ticket's detail is open.
  useTicketRealtime(ticketId);

  // Opening a ticket marks its thread read on the server; refresh the queue so
  // its unread badge clears without a manual reload. Keyed on the loaded id so
  // it fires once per ticket, not on every background refetch.
  const loadedTicketId = ticket?.id;
  useEffect(() => {
    if (!loadedTicketId) return;
    void queryClient.invalidateQueries({ queryKey: adminSupportKeys.listPrefix });
  }, [loadedTicketId, queryClient]);

  const backLink = (
    <Link
      href={getLocalizedPath(ROUTES.adminSupport, locale)}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {t("detail.back")}
    </Link>
  );

  if (isLoading && !ticket) {
    return (
      <div className="space-y-6">
        {backLink}
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="space-y-6">
        {backLink}
        <p className="text-center text-sm text-muted-foreground">{t("list.notFound")}</p>
      </div>
    );
  }

  const customerName =
    [ticket.user.first_name, ticket.user.last_name].filter(Boolean).join(" ") || ticket.user.email;
  const isClosed = ticket.status === "closed";

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col gap-6">
      {/* Pinned header */}
      <div className="shrink-0 space-y-2">
        {backLink}
        <h1 className="text-2xl font-semibold tracking-tight">{ticket.subject}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <TicketStatusBadge status={ticket.status} />
          <TicketPriorityBadge priority={ticket.priority} />
          <span className="text-sm text-muted-foreground">
            {`${t("admin.owner")}: ${customerName} (${ticket.user.email})`}
          </span>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-3">
        {/* Thread scrolls; composer pinned beneath it */}
        <div className="flex min-h-0 flex-col gap-4 lg:col-span-2">
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-border/50 bg-card/60">
            <CardContent className="min-h-0 flex-1 p-0">
              <MessageThread
                messages={ticket.messages}
                viewerRole="admin"
                counterpartLabel={customerName}
              />
            </CardContent>
          </Card>
          <div className="shrink-0">
            {isClosed ? (
              <p className="text-center text-sm text-muted-foreground">
                {t("detail.adminClosedNotice")}
              </p>
            ) : null}
            {!isClosed && canReply ? (
              <ReplyBox onSubmit={reply.mutateAsync} isPending={reply.isPending} />
            ) : null}
            {!isClosed && !canReply ? <PermissionNote /> : null}
          </div>
        </div>

        <div className="overflow-y-auto lg:col-span-1">
          <TicketAdminControls ticket={ticket} />
        </div>
      </div>
    </div>
  );
}
