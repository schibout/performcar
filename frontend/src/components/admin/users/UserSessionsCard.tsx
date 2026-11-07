"use client";

import { useState, type ReactNode } from "react";

import { LogOut, MonitorSmartphone, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/admin/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminUserSessions, useRevokeAdminUserSessions } from "@/hooks/api/use-admin";
import { formatDateTime } from "@/lib/format-date";
import type { SessionItem } from "@/lib/types/session";

const PAGE_SIZE = 10;

const MOBILE_OS = new Set(["iOS", "iPadOS", "Android"]);

interface DeviceIconProps {
  os: string | null;
}

const DeviceIcon = ({ os }: DeviceIconProps) => {
  const Icon = os && MOBILE_OS.has(os) ? Smartphone : MonitorSmartphone;
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Icon className="h-4 w-4" />
    </span>
  );
};

interface SessionRowProps {
  session: SessionItem;
}

const SessionRow = ({ session }: SessionRowProps) => {
  const { t } = useTranslation("admin");

  const deviceLabel =
    session.browser && session.os
      ? t("userDetail.sessions.deviceLabel", { browser: session.browser, os: session.os })
      : (session.browser ?? session.os ?? t("userDetail.sessions.unknownDevice"));

  return (
    <li className="flex items-center gap-3 rounded-xl border border-border/50 p-3">
      <DeviceIcon os={session.os} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{deviceLabel}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("userDetail.sessions.lastActive", { date: formatDateTime(session.last_used_at) })}
        </p>
      </div>
    </li>
  );
};

interface UserSessionsCardProps {
  userId: string;
  // Terminating sessions of an admin account needs admins:write.
  canRevoke?: boolean;
}

export function UserSessionsCard({ userId, canRevoke = true }: UserSessionsCardProps) {
  const { t } = useTranslation("admin");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading } = useAdminUserSessions(userId, { limit });
  const { mutate: revokeAll, isPending } = useRevokeAdminUserSessions();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const sessions = data?.data ?? [];
  const total = data?.total ?? 0;

  const handleRevokeAll = () => {
    revokeAll(userId, {
      onSettled: () => {
        setConfirmOpen(false);
      },
    });
  };

  let content: ReactNode;
  if (isLoading) {
    content = <Skeleton className="h-14 w-full rounded-xl" />;
  } else if (sessions.length === 0) {
    content = (
      <p className="py-2 text-center text-sm text-muted-foreground">
        {t("userDetail.sessions.empty")}
      </p>
    );
  } else {
    content = (
      <ul className="space-y-2">
        {sessions.map((session) => (
          <SessionRow key={session.id} session={session} />
        ))}
      </ul>
    );
  }

  return (
    <Card className="border-border/50 bg-card/60">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">{t("userDetail.sessions.title")}</CardTitle>
          <CardDescription>{t("userDetail.sessions.description")}</CardDescription>
        </div>
        {canRevoke && sessions.length > 0 ? (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={isPending}
            onClick={() => {
              setConfirmOpen(true);
            }}
          >
            <LogOut className="h-4 w-4" />
            {t("userDetail.sessions.revokeAll")}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {content}

        {!isLoading && total > sessions.length ? (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLimit((current) => current + PAGE_SIZE);
              }}
            >
              {t("userDetail.sessions.loadMore")}
            </Button>
          </div>
        ) : null}
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) setConfirmOpen(false);
        }}
        title={t("userDetail.sessions.confirm.title")}
        description={t("userDetail.sessions.confirm.description")}
        confirmLabel={t("userDetail.sessions.confirm.confirm")}
        cancelLabel={t("userDetail.sessions.confirm.cancel")}
        onConfirm={handleRevokeAll}
        isLoading={isPending}
        destructive
      />
    </Card>
  );
}
