"use client";

import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { PermissionNote } from "@/components/admin/shared/PermissionNote";
import { MessageThread } from "@/components/support/MessageThread";
import { ReplyBox } from "@/components/support/ReplyBox";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/support/TicketStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supportKeys, useCloseTicket, useMyTicket, useReplyTicket } from "@/hooks/api/use-support";
import { usePermissions } from "@/hooks/use-permissions";
import { useTicketRealtime } from "@/hooks/use-support-realtime";
import { getLocaleFromPath, getLocalizedPath, ROUTES } from "@/lib/config/routes";
import { Permission } from "@/lib/types/permissions";

interface TicketDetailContentProps {
  ticketId: string;
}

export function TicketDetailContent({ ticketId }: TicketDetailContentProps) {
  const { t } = useTranslation("support");
  const locale = getLocaleFromPath(usePathname());
  const queryClient = useQueryClient();
  const { isReady, has } = usePermissions();
  const canRead = has(Permission.SelfSupportRead);
  const canReply = has(Permission.SelfSupportReply);
  const canClose = has(Permission.SelfSupportClose);
  const { data: ticket, isLoading } = useMyTicket(ticketId);
  const { mutate: closeTicket, isPending: isClosing } = useCloseTicket(ticketId);
  const reply = useReplyTicket(ticketId);

  // Live updates: admin replies and status changes stream into the cache via
  // the shared support socket while this ticket's detail is open.
  useTicketRealtime(ticketId);

  // Opening a ticket marks its thread read on the server; refresh the list so
  // its unread badge clears without waiting for a manual reload. Keyed on the
  // loaded id so it fires once per ticket, not on every background refetch.
  const loadedTicketId = ticket?.id;
  useEffect(() => {
    if (!loadedTicketId) return;
    void queryClient.invalidateQueries({ queryKey: supportKeys.myListPrefix });
  }, [loadedTicketId, queryClient]);

  const backLink = (
    <Link
      href={getLocalizedPath(ROUTES.support, locale)}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {t("detail.back")}
    </Link>
  );

  if (isReady && !canRead) {
    return (
      <div className="mx-auto w-full max-w-480 space-y-6 p-4 sm:p-6 lg:p-8 xl:p-12">
        {backLink}
        <PermissionNote text={t("restricted")} />
      </div>
    );
  }

  if (!isReady || (isLoading && !ticket)) {
    return (
      <div className="mx-auto w-full max-w-480 space-y-6 p-4 sm:p-6 lg:p-8 xl:p-12">
        {backLink}
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="mx-auto w-full max-w-480 space-y-6 p-4 sm:p-6 lg:p-8 xl:p-12">
        {backLink}
        <p className="text-center text-sm text-muted-foreground">{t("list.notFound")}</p>
      </div>
    );
  }

  const isClosed = ticket.status === "closed";

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-480 flex-col gap-4 p-4 sm:p-6 lg:p-8 xl:p-12">
      {/* Pinned header */}
      <div className="shrink-0 space-y-4">
        {backLink}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{ticket.subject}</h1>
            <div className="flex items-center gap-2">
              <TicketStatusBadge status={ticket.status} />
              <TicketPriorityBadge priority={ticket.priority} />
            </div>
          </div>
          {!isClosed && canClose ? (
            <Button
              variant="outline"
              loading={isClosing}
              onClick={() => {
                closeTicket();
              }}
            >
              {t("detail.close")}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Only the thread scrolls */}
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-border/50 bg-card/60">
        <CardContent className="min-h-0 flex-1 p-0">
          <MessageThread messages={ticket.messages} viewerRole="user" />
        </CardContent>
      </Card>

      {/* Pinned composer */}
      <div className="shrink-0">
        {isClosed && (
          <p className="text-center text-sm text-muted-foreground">{t("detail.closedNotice")}</p>
        )}
        {!isClosed && !canReply && <PermissionNote text={t("detail.replyRestricted")} />}
        {!isClosed && canReply && (
          <ReplyBox onSubmit={reply.mutateAsync} isPending={reply.isPending} />
        )}
      </div>
    </div>
  );
}
